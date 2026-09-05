// Resend's HTTP API instead of SMTP - Render blocks outbound SMTP ports
// (confirmed via ETIMEDOUT testing raw Gmail SMTP from this same server),
// so sending has to go over plain HTTPS instead. RESEND_FROM must be an
// address on a domain verified in Resend's dashboard to send to anyone
// other than the Resend account's own signup email.
async function sendMail({ to, subject, html }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: process.env.RESEND_FROM, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error (${res.status}): ${body}`);
  }
}

module.exports = { sendMail };
