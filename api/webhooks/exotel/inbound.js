import { sql } from "../../../utils/db.js";
import axios from "axios";
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

        //0. Send the promotional message to the caller
        const whatsapp_url =
            `https://${process.env.WHATSAPP_API_KEY}:${process.env.WHATSAPP_API_TOKEN}@api.exotel.com/v2/accounts/${process.env.WHATSAPP_SID}/messages`;

            const whatsappPayload = {
            "custom_data": "TEST_MSG",
            "status_callback": "https://276144074cd209fa381a1c133da75f9e.m.pipedream.net",
            "whatsapp": {
                "messages": [
                {
                    "from": "+918047361856",
                    "to": normalizedPhone,
                    "content": {
                    "type": "template",
                    "template": {
                        "name": "lead_acknoweledgement_template",
                        "language": {
                        "policy": "deterministic",
                        "code": "en_US"
                        },
                        "components": [
                        {
                            "type": "header",
                            "parameters": [
                            {
                                "type": "image",
                                "image": {
                                "link": "https://drive.google.com/uc?export=download&id=1sTrrxmUCmj3gyuI6LeCEgmCajB_xUMY3"
                                }
                            }
                            ]
                        },
                        {
                            "type": "body",
                            "parameters": [
                            { "type": "text", "text": "user" },
                            { "type": "text", "text": "https://www.instagram.com/reel/DVTTOImAHI9/" },
                            { "type": "text", "text": "https://photos.app.goo.gl/3sJssYN7bRqu3QGWA" },
                            { "type": "text", "text": "https://drive.google.com/file/d/16uBylpcp7ds1NEw7bsfBGPK1mdbaVEz-/" },
                            { "type": "text", "text": "https://maps.app.goo.gl/6a45hJYnG9HCWYbb9" }
                            ]
                        }
                        ]
                    }
                    }
                }
                ]
            }
            };

        try {
            const waRes = await axios.post(whatsapp_url, whatsappPayload, {
                headers: { "Content-Type": "application/json" },
            });
            console.log("WhatsApp sent:", JSON.stringify(waRes.data, null, 2));
        } catch (waErr) {
            console.error(
                "WhatsApp failed:",
                waErr.response?.data ?? waErr.message
            );
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
