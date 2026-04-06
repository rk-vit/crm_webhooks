import nodemailer from "nodemailer";

export default async function sendEmail({ subject, data }) {
  try {
    const { Name, Email, Mobile, remarks, Project } = data;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    console.log("SENDING EMAIL");

    const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:20px;">
      <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <div style="background:#1e73be; color:#ffffff; padding:20px; text-align:center;">
          <h2 style="margin:0;">SriRam's CRM</h2>
          <p style="margin:5px 0 0; font-size:14px;">by Axion • New Lead Notification</p>
        </div>

        <!-- Body -->
        <div style="padding:20px;">
          <h3 style="margin-top:0; color:#333;">New Lead Received </h3>
          <p style="color:#555;">A new customer inquiry has been captured in your CRM.</p>

          <!-- Lead Details -->
          <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:15px; margin-top:15px;">
            
            <p style="margin:8px 0;"><strong>Name:</strong> ${Name}</p>
            <p style="margin:8px 0;"><strong>Email:</strong> ${Email || "NA"}</p>
            <p style="margin:8px 0;"><strong>Mobile:</strong> ${Mobile}</p>
            <p style="margin:8px 0;"><strong>Project:</strong> ${Project || "NA"}</p>
            <p style="margin:8px 0;"><strong>Remarks:</strong><br>${remarks}</p>

          </div>

          <!-- Timestamp -->
          <p style="margin-top:15px; font-size:12px; color:#888;">
            Received on: ${new Date().toLocaleString()}
          </p>

          <!-- CTA -->
          <div style="text-align:center; margin-top:20px;">
            <a href="https://axions-crm.vercel.app"
              style="background:#1e73be; color:#fff; padding:12px 20px; text-decoration:none; border-radius:6px; font-weight:bold; display:inline-block;">
              View in CRM
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background:#f1f5f9; padding:15px; text-align:center; font-size:12px; color:#666;">
          Axion Technologies • Custom Software Solutions<br/>
          We Grow With You
        </div>

      </div>
    </div>
    `;

    const info = await transporter.sendMail({
      from: `"Axion CRM" <${process.env.EMAIL_USER}>`,
      to: [
        "revanthkannam05@gmail.com"
      ],
      subject,
      html: htmlTemplate,
    });

    console.log("EMAIL SENT:", info.response);

  } catch (err) {
    console.error("EMAIL ERROR:", err);
  }
}