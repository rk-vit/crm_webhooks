import { sql } from "../../../utils/db.js";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).send("Method Not Allowed");
    }

    try {
        const {
            CallSid,
            CallFrom,
            CallTo,
            Direction,
        } = req.query;

        if (!CallSid || !CallFrom) {
            console.warn("Inbound webhook: missing params", req.query);
            return res.status(200).send("OK");
        }

        console.log("Inbound call received:", CallSid, "from:", CallFrom);

        // Normalize phone number for DB lookup
        let normalizedPhone = CallFrom.replace(/[\s\-()]/g, "");
        if (normalizedPhone.startsWith("0")) {
            normalizedPhone = "+91" + normalizedPhone.slice(1);
        }
        if (!normalizedPhone.startsWith("+")) {
            normalizedPhone = "+91" + normalizedPhone;
        }

        // Look up lead by phone number
        const leadResult = await sql`
            SELECT id, name, assigned_to
            FROM leads
            WHERE phone = ${normalizedPhone}
               OR phone = ${CallFrom}
               OR alternate_phone = ${normalizedPhone}
               OR alternate_phone = ${CallFrom}
            LIMIT 1
        `;

        const leadId = leadResult.length > 0 ? leadResult[0].id : null;
        const leadName = leadResult.length > 0 ? leadResult[0].name : "Unknown Caller";
        const assignedTo = leadResult.length > 0 ? leadResult[0].assigned_to : null;

        if (!leadId) {
            console.log("Inbound call from unknown number:", CallFrom);
            return res.status(200).send("OK");
        }

        // Log the inbound call
        await sql`
            INSERT INTO call_logs
                (lead_id, caller_number, caller_to, duration, direction, status, assigned_to, exotel_call_sid)
            VALUES
                (${leadId}, ${normalizedPhone}, ${CallTo}, 0, 'inbound', 'no_answer', ${assignedTo}, ${CallSid})
        `;

        // Add timeline event
        await sql`
            INSERT INTO timeline_events
                (lead_id, type, title, description, created_by, metadata)
            VALUES (
                ${leadId},
                'call',
                'Incoming Call Received',
                ${`Incoming call from ${leadName} (${normalizedPhone})`},
                'system',
                ${JSON.stringify({ callSid: CallSid, from: CallFrom, to: CallTo, direction: "inbound" })}
            )
        `;

        console.log("Inbound call logged for lead:", leadId, leadName);
        return res.status(200).send("OK");

    } catch (err) {
        console.error("Inbound webhook error:", err);
        return res.status(200).send("OK");
    }
}
