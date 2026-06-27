const router = require('express').Router();
const { sendMail } = require('../services/emailService');

// GET /api/email/config
// Returns which transport will be used (SendGrid vs SMTP) and basic env checks
router.get('/config', (req, res) => {
  const cfg = {
    sendgrid_enabled: !!process.env.SENDGRID_API_KEY,
    smtp_user: !!process.env.EMAIL_USER,
    smtp_pass: !!process.env.EMAIL_PASS,
    email_test_recipient: process.env.EMAIL_TEST_RECIPIENT || null,
  };
  res.json(cfg);
});

// POST /api/email/test
// Body: { to?: string, subject?: string, text?: string }
// If `to` not provided, uses EMAIL_TEST_RECIPIENT from env
router.post('/test', async (req, res) => {
  const to = (req.body && (req.body.to || req.query.to)) || process.env.EMAIL_TEST_RECIPIENT;
  if (!to) return res.status(400).json({ message: 'Missing recipient. Provide body.to or set EMAIL_TEST_RECIPIENT in env.' });

  const subject = (req.body && req.body.subject) || 'PayFlow test email';
  const text = (req.body && req.body.text) || 'This is a test email from ORBEM PayFlow.';

  try {
    await sendMail({ to, subject, text });
    return res.json({ message: `Test email queued to ${to}` });
  } catch (err) {
    console.error('Test email failed:', err);
    return res.status(500).json({ message: 'Test email failed', error: err.message || String(err) });
  }
});

module.exports = router;
