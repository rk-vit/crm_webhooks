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

        // Normalize phone number
        let normalizedPhone = CallFrom.replace(/[\s\-()]/g, "");
        if (normalizedPhone.startsWith("0")) {
            normalizedPhone = "+91" + normalizedPhone.slice(1);
        }
        if (!normalizedPhone.startsWith("+")) {
            normalizedPhone = "+91" + normalizedPhone;
        }

        // 1. Check if number is blocked (spam)
        const blocked = await sql`
            SELECT id FROM blocked_numbers
            WHERE phone = ${normalizedPhone} OR phone = ${CallFrom}
            LIMIT 1
        `;

        if (blocked.length > 0) {
            console.log("Blocked number ignored:", CallFrom);
            return res.status(200).send("OK");
        }

        // 2. Check if caller is an existing lead
        const leadResult = await sql`
            SELECT id, name, assigned_to
            FROM leads
            WHERE phone = ${normalizedPhone}
               OR phone = ${CallFrom}
               OR alternate_phone = ${normalizedPhone}
               OR alternate_phone = ${CallFrom}
            LIMIT 1
        `;

        if (leadResult.length > 0) {
            // Known lead — log in call_logs + timeline
            const lead = leadResult[0];

            await sql`
                INSERT INTO call_logs
                    (lead_id, caller_number, caller_to, duration, direction, status, assigned_to, exotel_call_sid)
                VALUES
                    (${lead.id}, ${normalizedPhone}, ${CallTo}, 0, 'inbound', 'no_answer', ${lead.assigned_to}, ${CallSid})
            `;

            await sql`
                INSERT INTO timeline_events
                    (lead_id, type, title, description, created_by, metadata)
                VALUES (
                    ${lead.id},
                    'call',
                    'Incoming Call Received',
                    ${`Incoming call from ${lead.name} (${normalizedPhone})`},
                    'system',
                    ${JSON.stringify({ callSid: CallSid, from: CallFrom, to: CallTo, direction: "inbound" })}
                )
            `;

            console.log("Inbound call logged for lead:", lead.id, lead.name);
        } else {
            // Unknown caller — log in unknown_callers table
            // Replace the old INSERT with this:
            await sql`
              INSERT INTO unknown_callers (phone, exotel_call_sid, call_count)
              VALUES (${normalizedPhone}, ${CallSid}, 1)
              ON CONFLICT (phone) WHERE reviewed = false
              DO UPDATE SET
                exotel_call_sid = ${CallSid},
                call_count = unknown_callers.call_count + 1,
                created_at = CURRENT_TIMESTAMP
            `;


            console.log("Unknown caller logged:", normalizedPhone);
        }

        return res.status(200).send("OK");

    } catch (err) {
        console.error("Inbound webhook error:", err);
        return res.status(200).send("OK");
    }
}
