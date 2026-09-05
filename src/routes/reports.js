const express = require("express");
const asyncHandler = require("../lib/asyncHandler");
const { buildDailyDashboardHtml } = require("../reports/dailyDashboard");
const { sendMail } = require("../lib/mailer");

const router = express.Router();

// No user login here - this is hit by an external cron pinger (e.g.
// cron-job.org) once a day, not by anyone using the app, so it's guarded by
// a shared secret header instead of the normal JWT auth middleware.
function requireCronSecret(req, res, next) {
  const provided = req.header("X-Report-Secret");
  if (!process.env.REPORT_CRON_SECRET || provided !== process.env.REPORT_CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

router.post("/daily-dashboard", requireCronSecret, asyncHandler(async (req, res) => {
  const recipients = (process.env.REPORT_RECIPIENTS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!recipients.length) {
    return res.status(400).json({ error: "REPORT_RECIPIENTS is not configured" });
  }

  const html = await buildDailyDashboardHtml();
  await sendMail({
    to: recipients,
    subject: `Sarpanch Ka Samman - Daily Enquiry Report - ${new Date().toISOString().slice(0, 10)}`,
    html,
  });

  res.json({ ok: true, sentTo: recipients.length });
}));

module.exports = router;
