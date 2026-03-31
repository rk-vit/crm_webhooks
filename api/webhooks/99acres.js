import sendEmail from "../../utils/sendEmail.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const body = JSON.stringify(req.body, null, 2);

    await sendEmail({
      subject: "[WEBHOOK TEST] 99acres",
      content: body,
    });

    console.log("99acres:", body);

    return res.status(200).send("OK");
  } catch (err) {
    console.error(err);
    return res.status(500).send("Error");
  }
}