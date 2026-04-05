import sendEmail from "../../utils/sendEmail.js";
import { sql } from "../../utils/db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const { Name, Email, Mobile, remarks, Project } = req.body;
    const body = JSON.stringify(req.body, null, 2);

    await sendEmail({
      subject: "[WEBHOOK TEST] by 99acres",
      content: body,
    });

    const existingLeads = await sql`
      SELECT id FROM leads WHERE phone = ${Mobile} LIMIT 1
    `;

    if (existingLeads.length > 0) {
      const leadId = existingLeads[0].id;

      await sql`
        UPDATE leads 
        SET 
          status = 'reengaged',
          updated_at = NOW()
        WHERE id = ${leadId}
      `;

      await sql`
        INSERT INTO timeline_events (
          lead_id, 
          type, 
          title, 
          description, 
          created_by, 
          created_at
        )
        VALUES (
          ${leadId}, 
          'status_change', 
          'Lead Re-engaged', 
          ${`Customer inquired again via 99acres for project: ${Project}`}, 
          'system', 
          NOW()
        )
      `;

      console.log("99acres: Lead Re-engaged", leadId);
    } else {
      const lastLeads = await sql`
        SELECT id FROM leads 
        WHERE id LIKE 'AX%' 
        ORDER BY id DESC LIMIT 1
      `;

     let nextId;
      if (lastLeads.length > 0) {
      const lastNum = parseInt(lastLeads[0].id.replace("AX", ""), 10);
      const nextNum = lastNum + 1;
      nextId = `AX${nextNum.toString().padStart(4, "0")}`;
      } else {
          nextId = "AX0001";
      }
      await sql`
        INSERT INTO leads (
          id, name, email, phone, project, status, source, medium, assigned_to, created_at, updated_at
        )
        VALUES (
          ${nextId}, ${Name}, ${Email}, ${Mobile}, ${remarks + "," + Project}, 'new', '99acres', 'Webhook', 'user-1', NOW(), NOW()
        )
      `;

      await sql`
        INSERT INTO timeline_events (
          lead_id, type, title, description, created_by, created_at
        )
        VALUES (
          ${nextId}, 'workflow', 'Lead Created', 'New lead captured from 99acres webhook', 'user-1', NOW()
        )
      `;

      console.log("99acres: New Lead Created", nextId);
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error(err);
    return res.status(500).send("Error");
  }
}
