import nodemailer from "nodemailer";

export default async function sendEmail({ subject, content }) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
  from: process.env.EMAIL_USER,
  to: [
    "revanthkannam05@gmail.com",
    "abinav0506@gmail.com",
    "anirudh2005.1805@gmail.com",
    "arjun.iyyappan.2005@gmail.com"
  ],
  subject,
  html: `<pre>${content}</pre>`,
});
}