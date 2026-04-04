import sendEmail from "../../utils/sendEmail.js";
import { sql } from "../../utils/db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    console.log("RAW:", req.body);

    // ✅ FIXED FIELD MAPPING
    const name = req.body.Name;
    const phone = req.body.Mobile;
    const email = req.body.Email;
    const message = req.body.remarks;

    const body = JSON.stringify(req.body, null, 2);

    // ✅ respond immediately
    await sendEmail({
          subject: "[WEBHOOK TEST] by Housing.com",
          content: body,
    });
    // 🔥 generate ID safely
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
        'new',  -- ✅ FIXED
        'Housing', 
        'Webhook', 
        'user-1',
        NOW(), 
        NOW()
      )
    `;
    res.status(200).json({ status: "received" });

  } catch (err) {
    console.error("ERROR:", err);
  }
}
