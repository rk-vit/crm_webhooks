import sendEmail from "../../utils/sendEmail.js";
import { sql } from "../../utils/db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const { 
      name, 
      phone, 
      email, 
      message 
    } = req.body;

    const body = JSON.stringify(req.body, null, 2);

    const lastLeads = await sql`
      SELECT id FROM leads 
      WHERE id LIKE 'RS%' 
      ORDER BY id DESC LIMIT 1
    `;

    let nextId;
    if (lastLeads.length > 0) {
      const lastNum = parseInt(lastLeads[0].id.replace("RS", ""), 10);
      nextId = `RS${lastNum + 1}`;
    }

    await sendEmail({
      subject: "[WEBHOOK TEST] by Housing",
      content: body,
    });

    await sql`
      INSERT INTO leads (
        id,
        name, 
        email, 
        phone,
        project, 
        status, 
        source, 
        medium, 
        assigned_to,
        created_at, 
        updated_at
      )
      VALUES (
        ${nextId}, 
        ${name}, 
        ${email}, 
        ${phone}, 
        ${message}, 
        'new',
        'housing', 
        'Webhook', 
        'user-1',
        NOW(), 
        NOW()
      )
    `;
    
    console.log("Housing:", body);

    return res.status(200).send("OK");
  } catch (err) {
    console.error(err);
    return res.status(500).send("Error");
  }
}
