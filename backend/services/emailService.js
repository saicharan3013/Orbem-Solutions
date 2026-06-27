const https = require('https');
const nodemailer = require('nodemailer');

const brevoKey = process.env.BREVO_API_KEY;
const emailUser = process.env.EMAIL_USER;
const emailPass = String(process.env.EMAIL_PASS || '').replace(/\s+/g, '');
const emailFrom = process.env.EMAIL_FROM || emailUser;
const emailHost = process.env.EMAIL_HOST || 'smtp-relay.brevo.com';
const emailPort = Number(process.env.EMAIL_PORT || 587);

function createSmtpTransporter() {
  if (!emailUser || !emailPass) {
    throw new Error('EMAIL_USER and EMAIL_PASS are required for SMTP transport');
  }

  return nodemailer.createTransport({
    host: emailHost,
    port: emailPort,
    secure: false,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });
}

function brevoRequest(payload) {
  return new Promise((resolve, reject) => {
    const requestData = JSON.stringify(payload);

    const requestOptions = {
      method: 'POST',
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData),
        'api-key': brevoKey,
      },
    };

    const req = https.request(requestOptions, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`Brevo send failed (${res.statusCode}): ${responseBody}`));
        }
      });
    });

    req.on('error', reject);
    req.write(requestData);
    req.end();
  });
}

async function sendViaBrevo({ from, to, subject, text, html, attachments }) {
  if (!brevoKey) {
    throw new Error('BREVO_API_KEY is not configured');
  }

  const payload = {
    sender: { email: from || emailFrom },
    to: [{ email: to }],
    subject,
  };

  if (text) payload.textContent = text;
  if (html) payload.htmlContent = html;

  if (attachments && attachments.length) {
    payload.attachment = attachments.map((attachment) => {
      let contentString = attachment.content;
      if (Buffer.isBuffer(attachment.content)) {
        contentString = attachment.content.toString('base64');
      } else if (typeof attachment.content === 'string') {
        contentString = Buffer.from(attachment.content, 'utf8').toString('base64');
      }
      return {
        content: contentString,
        name: attachment.filename,
        type: attachment.contentType || 'application/octet-stream',
      };
    });
  }

  await brevoRequest(payload);
}

async function sendMail(options) {
  if (!options.to) {
    throw new Error('Missing recipient address');
  }

  if (!options.subject) {
    throw new Error('Missing email subject');
  }

  options.from = options.from || emailFrom;

  if (brevoKey) {
    return sendViaBrevo(options);
  }

  const transporter = createSmtpTransporter();
  await transporter.verify();
  return transporter.sendMail(options);
}

module.exports = {
  sendMail,
};
