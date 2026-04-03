import sendEmail from "../../utils/sendEmail.js";
import { sql } from "../../utils/db.js";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
    }

    try {
        const {
            CallSid,
            Status,
            From,
            To,
            ConversationDuration,
            RecordingUrl,
        } = req.body;

        if (!CallSid) {
            console.warn("Exotel webhook: missing CallSid", req.body);
            return res.status(400).send("Bad Request");
        }

        const body = JSON.stringify(req.body, null, 2);
        console.log("Exotel callback received:", body);

        const statusMap = {
            completed: "answered",
            failed: "missed",
            busy: "busy",
            "no-answer": "no_answer",
            canceled: "missed",
        };
        const dbStatus = statusMap[Status] ?? "no_answer";

        const durationSeconds = ConversationDuration
            ? parseInt(ConversationDuration, 10)
            : 0;

        const updated = await sql`
            UPDATE call_logs
            SET
                status        = ${dbStatus},
                duration      = ${durationSeconds},
                recording_url = ${RecordingUrl ?? null}
            WHERE exotel_call_sid = ${CallSid}
            RETURNING id, lead_id
        `;

        if (updated.length === 0) {
            console.warn("Exotel webhook: no call_log found for CallSid", CallSid);
            return res.status(200).send("OK - no matching call found");
        }

        console.log(
            "Exotel callback processed:",
            CallSid,
            dbStatus,
            durationSeconds + "s",
            RecordingUrl ? "has recording" : "no recording"
        );

        // Send email notification for completed calls
        if (dbStatus === "answered" && durationSeconds > 0) {
            await sendEmail({
                subject: `[CALL] ${From} → ${To} — ${durationSeconds}s`,
                content: body,
            });
        }

        return res.status(200).send("OK");

    } catch (err) {
        console.error("Exotel webhook error:", err);
        return res.status(200).send("OK");
    }
}
