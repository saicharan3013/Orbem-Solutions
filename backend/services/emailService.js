const https = require('https');
const nodemailer = require('nodemailer');

const sendGridKey = process.env.SENDGRID_API_KEY;
const emailUser = process.env.EMAIL_USER;
const emailPass = String(process.env.EMAIL_PASS || '').replace(/\s+/g, '');
const emailFrom = process.env.EMAIL_FROM || emailUser;
const emailHost = process.env.EMAIL_HOST || 'smtp-relay.brevo.com';
const emailPort = Number(process.env.EMAIL_PORT || 587);
const emailSecure = false;
const emailRequireTLS = true;

function createSmtpTransporter() {
  if (!emailUser || !emailPass) {
    throw new Error("EMAIL_USER and EMAIL_PASS are required");
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

function sendGridRequest(payload) {
  return new Promise((resolve, reject) => {
    const requestData = JSON.stringify(payload);

    const requestOptions = {
      method: 'POST',
      hostname: 'api.sendgrid.com',
      path: '/v3/mail/send',
      headers: {
        Authorization: `Bearer ${sendGridKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData),
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
          reject(new Error(`SendGrid send failed (${res.statusCode}): ${responseBody}`));
        }
      });
    });

    req.on('error', reject);
    req.write(requestData);
    req.end();
  });
}

async function sendViaSendGrid({ from, to, subject, text, html, attachments }) {
  if (!sendGridKey) {
    throw new Error('SENDGRID_API_KEY is not configured');
  }

  const payload = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: from || emailFrom },
    subject,
    content: [],
  };

  if (text) payload.content.push({ type: 'text/plain', value: text });
  if (html) payload.content.push({ type: 'text/html', value: html });

  if (attachments && attachments.length) {
    payload.attachments = attachments.map((attachment) => {
      let contentString = attachment.content;

      if (Buffer.isBuffer(attachment.content)) {
        contentString = attachment.content.toString('base64');
      } else if (typeof attachment.content === 'string') {
        contentString = Buffer.from(attachment.content, 'utf8').toString('base64');
      }

      return {
        content: contentString,
        filename: attachment.filename,
        type: attachment.contentType || 'application/octet-stream',
        disposition: attachment.contentDisposition || 'attachment',
      };
    });
  }

  await sendGridRequest(payload);
}

async function sendMail(options) {
  if (!options.to) {
    throw new Error('Missing recipient address');
  }
  if (!options.subject) {
    throw new Error('Missing email subject');
  }
  options.from = options.from || emailFrom;

  if (sendGridKey) {
    return sendViaSendGrid(options);
  }

  const transporter = createSmtpTransporter();
  await transporter.verify();
  return transporter.sendMail(options);
}

module.exports = {
  sendMail,
};
