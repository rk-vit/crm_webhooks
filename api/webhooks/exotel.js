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
            StartTime,
            EndTime,
            RecordingUrl,
        } = req.body;

        if (!CallSid) {
            console.warn("Exotel webhook: missing CallSid", req.body);
            return res.status(400).send("Bad Request");
        }

        const body = JSON.stringify(req.body, null, 2);

        // Map Exotel status → your DB enum
        const statusMap = {
            completed: "completed",
            failed: "failed",
            busy: "busy",
            "no-answer": "no_answer",
            canceled: "canceled",
        };
        const dbStatus = statusMap[Status] ?? "unknown";

        const durationSeconds = ConversationDuration
            ? parseInt(ConversationDuration, 10)
            : 0;

        const updated = await sql`
      UPDATE call_logs
      SET
        status        = ${dbStatus},
        duration      = ${durationSeconds},
        recording_url = ${RecordingUrl ?? null},
        started_at    = ${StartTime ? new Date(StartTime) : null},
        ended_at      = ${EndTime ? new Date(EndTime) : null},
        updated_at    = NOW()
      WHERE exotel_call_sid = ${CallSid}
      RETURNING id
    `;

        if (updated.length === 0) {
            console.warn("Exotel webhook: no call_log found for CallSid", CallSid);
            return res.status(200).send("OK");
        }

        if (dbStatus === "completed" && durationSeconds > 0) {
            await sendEmail({
                subject: `[CALL] ${From} → ${To} — ${durationSeconds}s`,
                content: body,
            });
        }

        console.log("Exotel callback:", CallSid, dbStatus, durationSeconds + "s");
        return res.status(200).send("OK");

    } catch (err) {
        console.error("Exotel webhook error:", err);
        return res.status(200).send("OK");
    }
}