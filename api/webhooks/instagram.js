import dotenv from "dotenv";
dotenv.config();
import sendEmail from "../../utils/sendEmail.js";
import { sql } from "../../utils/db.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send("Verification failed");
  }

  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const body = req.body;
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0] || entry?.messaging?.[0]; 
    const field = change?.field || (entry?.messaging ? "messages" : null);
    const value = change?.value || change;

    if (field) {
      let name = "Instagram User";
      let messageContent = "";
      let source = "Instagram";
      let phone = "N/A";
      let email = "N/A";

      if (field === "comments") {
        name = value.from?.username || value.from?.id;
        messageContent = `Comment: ${value.text} (Media ID: ${value.media?.id})`;
      } else if (field === "messages") {
        name = `User_${value.sender?.id}`;
        messageContent = `DM: ${value.message?.text}`;
      } else if (field === "message_reactions") {
        name = `User_${value.sender?.id}`;
        messageContent = `Reaction: ${value.reaction?.emoji} on ${value.reaction?.mid}`;
      } else if (field === "messaging_referral") {
        name = `User_${value.sender?.id}`;
        messageContent = `Referral Source: ${value.referral?.source} (Ref: ${value.referral?.ref})`;
      }

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

      await sql`
        INSERT INTO leads (
          id, name, email, phone, project, status, source, medium, assigned_to, created_at, updated_at
        )
        VALUES (
          ${nextId}, ${name}, ${email}, ${phone}, ${messageContent}, 'new', ${source}, ${field}, 'user-1', NOW(), NOW()
        )
      `;

      await sendEmail({
        subject: `[INSTAGRAM ${field.toUpperCase()}] - ${nextId}`,
        content: `User: ${name}\nField: ${field}\nContent: ${messageContent}`,
      });

      console.log(`Instagram ${field} Processed:`, nextId);
    }

    return res.status(200).send("EVENT_RECEIVED");
  } catch (err) {
    console.error(err);
    return res.status(500).send("Error");
  }
}