const express = require("express");
const nodemailer = require("nodemailer");
const router = express.Router();

// Use same SMTP config as server.js (reads from .env)
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_HOST = process.env.EMAIL_HOST;
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || "587");

let transporterConfig;

if (EMAIL_HOST) {
  transporterConfig = {
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: false,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    tls: { rejectUnauthorized: false },
  };
} else if (EMAIL_USER?.includes("@gmail.com")) {
  transporterConfig = {
    service: "gmail",
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  };
} else {
  const domain = EMAIL_USER?.split("@")[1];
  transporterConfig = {
    host: `mail.${domain}`,
    port: 587,
    secure: false,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    tls: { rejectUnauthorized: false },
  };
}

const contactMailer = nodemailer.createTransport(transporterConfig);

router.post("/", async (req, res) => {
  const { name, affiliation, designation, phone, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Name, email, and message are required." });
  }

  try {
    await contactMailer.sendMail({
      from: `"Spatial Biologics Contact" <${EMAIL_USER}>`,
      to: EMAIL_USER,
      replyTo: email,
      subject: `Query from ${name} - Spatial Biologics`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:24px 32px">
            <h2 style="color:#fff;margin:0;font-size:20px">New Contact Form Submission</h2>
            <p style="color:#bfdbfe;margin:6px 0 0;font-size:13px">Spatial Biologics</p>
          </div>
          <div style="padding:28px 32px;background:#fff">
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:8px 0;color:#64748b;width:140px;font-weight:600">Full Name</td><td style="padding:8px 0;color:#1e293b">${name}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Email</td><td style="padding:8px 0;color:#1e293b"><a href="mailto:${email}" style="color:#2563eb">${email}</a></td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Phone</td><td style="padding:8px 0;color:#1e293b">${phone || "-"}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Designation</td><td style="padding:8px 0;color:#1e293b">${designation || "-"}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Affiliation</td><td style="padding:8px 0;color:#1e293b">${affiliation || "-"}</td></tr>
            </table>
            <div style="margin-top:20px;padding:16px;background:#f8fafc;border-radius:8px;border-left:4px solid #2563eb">
              <div style="font-size:12px;font-weight:700;color:#64748b;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em">Message</div>
              <div style="color:#1e293b;font-size:14px;line-height:1.6;white-space:pre-wrap">${message}</div>
            </div>
          </div>
          <div style="background:#f8fafc;padding:16px 32px;font-size:12px;color:#94a3b8;text-align:center">
            Sent via Spatial Biologics Contact Form | Reply directly to respond to ${name}
          </div>
        </div>
      `,
    });
    console.log(`✅ Contact email sent from ${email}`);
    res.json({ success: true, message: "Email sent successfully." });
  } catch (err) {
    console.error("❌ Contact email error:", err.message);
    res.status(500).json({ error: "Failed to send email. " + err.message });
  }
});

module.exports = router;