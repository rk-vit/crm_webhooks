import sendEmail from "../../utils/sendEmail.js";
import {sql} from "../../utils/db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const body = JSON.stringify(req.body, null, 2);

    await sendEmail({
      subject: "[WEBHOOK TEST] by 99acres",
      content: body,
    });

    await sql`
      INSERT INTO leads (
        id,
        name, 
        email, 
        phone,
        alternate_phone, 
        project, 
        status, 
        source, 
        medium, 
        assigned_to,
        created_at, 
        updated_at,
      )
      VALUES (
        id, 
        ${name}, 
        ${email}, 
        ${phone}, 
        ${property_name}, 
        'New',
        '99acres', 
        'Webhook', 
        user-1,
        NOW(), 
        NOW(),
      )
    `;

    console.log("99acres:", body);

    return res.status(200).send("OK");
  } catch (err) {
    console.error(err);
    return res.status(500).send("Error");
  }
}