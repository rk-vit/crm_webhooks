// import dotenv from "dotenv";
// dotenv.config();

// import sendEmail from "../../utils/sendEmail.js";
// import { sql } from "../../utils/db.js";

// export default async function handler(req, res) {
//   // ✅ Meta verification (GET)
//   // if (req.method === "GET") {
//     const mode = req.query["hub.mode"];
//     const token = req.query["hub.verify_token"];
//     const challenge = req.query["hub.challenge"];

//     if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
//       return res.status(200).send(challenge);
//     }
//     return res.status(403).send("Verification failed");
//   }

//   // ❌ Only POST allowed beyond this
//   if (req.method !== "POST") {
//     return res.status(405).send("Method Not Allowed");
//   }

//   try {
//     const body = req.body;

//     const entry = body.entry?.[0];
//     const change = entry?.changes?.[0] || entry?.messaging?.[0];
//     const field = change?.field || (entry?.messaging ? "messages" : null);
//     const value = change?.value || change;

//     if (!field) {
//       return res.status(200).send("No relevant event");
//     }

//     // 🔹 Default values (Instagram has limited data)
//     let name = "Instagram User";
//     let messageContent = "";
//     const source = "Instagram";
//     const phone = "N/A";
//     const email = "N/A";

//     // 🔹 Parse event types
//     if (field === "comments") {
//       name = value.from?.username || value.from?.id || "Instagram User";
//       messageContent = `Comment: ${value.text} (Media ID: ${value.media?.id})`;
//     } else if (field === "messages") {
//       name = `User_${value.sender?.id || "unknown"}`;
//       messageContent = `DM: ${value.message?.text || "No text"}`;
//     } else if (field === "message_reactions") {
//       name = `User_${value.sender?.id || "unknown"}`;
//       messageContent = `Reaction: ${value.reaction?.emoji} on ${value.reaction?.mid}`;
//     } else if (field === "messaging_referral") {
//       name = `User_${value.sender?.id || "unknown"}`;
//       messageContent = `Referral: ${value.referral?.source} (Ref: ${value.referral?.ref})`;
//     } else {
//       messageContent = "Unhandled Instagram event";
//     }

//     // 🔹 Generate next lead ID (AX0001 format)
//     const lastLeads = await sql`
//       SELECT id FROM leads 
//       WHERE id LIKE 'AX%' 
//       ORDER BY id DESC LIMIT 1
//     `;

//     let nextId;

//     if (lastLeads.length > 0) {
//       const lastNum = parseInt(lastLeads[0].id.replace("AX", ""), 10);
//       const nextNum = lastNum + 1;
//       nextId = `AX${nextNum.toString().padStart(4, "0")}`;
//     } else {
//       nextId = "AX0001";
//     }

//     // 🔹 Insert lead
//     await sql`
//       INSERT INTO leads (
//         id, name, email, phone, project, status, source, medium, assigned_to, created_at, updated_at
//       )
//       VALUES (
//         ${nextId},
//         ${name},
//         ${email},
//         ${phone},
//         ${messageContent},
//         'new',
//         ${source},
//         ${field},
//         'user-1',
//         NOW(),
//         NOW()
//       )
//     `;

//     // 🔹 Timeline event
//     await sql`
//       INSERT INTO timeline_events (
//         lead_id, type, title, description, created_by, created_at
//       )
//       VALUES (
//         ${nextId},
//         'workflow',
//         'Instagram Lead Captured',
//         ${`Captured via Instagram ${field}`},
//         'system',
//         NOW()
//       )
//     `;

//     // 🔹 Send Email (UPDATED STRUCTURE ✅)
//     await sendEmail({
//       subject: `[INSTAGRAM ${field.toUpperCase()}] - ${nextId}`,
//       data: {
//         Name: name,
//         Email: "N/A",
//         Mobile: "N/A",
//         remarks: messageContent,
//         Project: `Instagram (${field})`
//       }
//     });

//     console.log(`✅ Instagram ${field} Processed:`, nextId);

//     return res.status(200).send("EVENT_RECEIVED");

//   } catch (err) {
//     console.error("❌ INSTAGRAM WEBHOOK ERROR:", err);
//     return res.status(500).send("Error");
//   }
// }
