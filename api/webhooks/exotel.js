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

        // 1. Try updating call_logs (for known leads — both outbound and inbound)
        const updated = await sql`
            UPDATE call_logs
            SET
                status        = ${dbStatus},
                duration      = ${durationSeconds},
                recording_url = ${RecordingUrl ?? null}
            WHERE exotel_call_sid = ${CallSid}
            RETURNING id, lead_id
        `;

        if (updated.length > 0) {
            console.log("Call log updated:", CallSid, dbStatus, durationSeconds + "s");
            return res.status(200).send("OK");
        }

        // 2. Fallback: try updating unknown_callers table
        const unknownUpdated = await sql`
            UPDATE unknown_callers
            SET
                call_status   = ${dbStatus},
                call_duration = ${durationSeconds},
                recording_url = ${RecordingUrl ?? null}
            WHERE exotel_call_sid = ${CallSid}
            RETURNING id
        `;

        if (unknownUpdated.length > 0) {
            console.log("Unknown caller updated:", CallSid, dbStatus, durationSeconds + "s");
        } else {
            console.warn("No matching record for CallSid:", CallSid);
        }

        return res.status(200).send("OK");

    } catch (err) {
        console.error("Exotel webhook error:", err);
        return res.status(200).send("OK");
    }
}
