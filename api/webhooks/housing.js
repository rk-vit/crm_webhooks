import sendEmail from "../../utils/sendEmail.js";
import { sql } from "../../utils/db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    console.log("RAW:", req.body);

    const name = req.body.Name;
    const phone = req.body.Mobile;
    const email = req.body.Email;
    const project = req.body.Project;
    const message = req.body.remarks;

    const body = JSON.stringify(req.body, null, 2);

    // ✅ RESPOND IMMEDIATELY
    res.status(200).json({ success: true });

    // ✅ BACKGROUND TASK
    (async () => {
      try {
        await sendEmail({
          subject: "[WEBHOOK TEST] Housing",
          content: body,
        });

        const lastLeads = await sql`
          SELECT id FROM leads 
          WHERE id LIKE 'RS%' 
          ORDER BY id DESC LIMIT 1
        `;

        let nextId = "RS1001";

        if (lastLeads.length > 0) {
          const lastNum = parseInt(lastLeads[0].id.replace("RS", ""), 10);
          nextId = `RS${lastNum + 1}`;
        }

        await sql`
          INSERT INTO leads (
            id, name, email, phone, project,
            status, source, medium, assigned_to,
            created_at, updated_at
          )
          VALUES (
            ${nextId}, 
            ${name}, 
            ${email}, 
            ${phone}, 
            ${project}, 
            'new',
            'Housing', 
            'Webhook', 
            'user-1',
            NOW(), 
            NOW()
          )
        `;

        console.log("✅ Lead stored");

      } catch (err) {
        console.error("❌ BACKGROUND ERROR:", err);
      }
    })();

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}