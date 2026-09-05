const nodemailer = require("nodemailer");

// SMTP_HOST/PORT default to Gmail's fixed endpoint since that's what every
// Gmail/Workspace account uses - only SMTP_USER/SMTP_APP_PASSWORD need to
// vary per deployment. SMTP_USER must have an app password (2-Step
// Verification), not its normal account password - Gmail rejects plain
// password SMTP logins.
let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_APP_PASSWORD,
    },
  });
  return transporter;
}

async function sendMail({ to, subject, html }) {
  const transport = getTransporter();
  await transport.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}

module.exports = { sendMail };
