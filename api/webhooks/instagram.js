import sendEmail from "../../utils/sendEmail.js";

export default async function handler(req, res) {
  // --- CHANGE 1: ADD GET METHOD FOR META VERIFICATION ---
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    // This 'MY_VERIFY_TOKEN' is a string YOU choose and put in Meta Dashboard
    if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send("Verification failed");
  }

  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  // --- CHANGE 2: HANDLE META LEAD LOGIC ---
  try {
    const body = req.body;

    // Meta sends an ID, not the actual name/phone directly
    const leadId = body.entry?.[0]?.changes?.[0]?.value?.leadgen_id;

    if (leadId) {
      // CHANGE 3: CALL GRAPH API TO GET DATA
      // You must use your PERMANENT PAGE ACCESS TOKEN here
      const fbResponse = await fetch(
        `https://graph.facebook.com/v20.0/${leadId}?access_token=${process.env.META_PAGE_ACCESS_TOKEN}`
      );
      const leadDetails = await fbResponse.json();

      // Now you have the actual data to send in the email
      await sendEmail({
        subject: "[NEW INSTAGRAM LEAD]",
        content: JSON.stringify(leadDetails, null, 2),
      });

      console.log("Instagram Lead Processed:", leadId);
    }

    return res.status(200).send("EVENT_RECEIVED");
  } catch (err) {
    console.error(err);
    return res.status(500).send("Error");
  }
}