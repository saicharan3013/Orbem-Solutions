const nodemailer = require('nodemailer');

/**
 * Send a 1-day advance reminder email for upcoming invoice due date
 */
async function sendDueEmailReminder(email, invoice) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // TLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 10000,
    socketTimeout: 10000,
  });

  const dueDate = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'N/A';

  const remainingAmount = invoice.remaining_amount || invoice.amount;
  const paidAmount = invoice.paid_amount || 0;

  const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
    .header { background-color: #ff9800; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .header h2 { margin: 0; }
    .content { padding: 20px; }
    .invoice-details { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .invoice-details p { margin: 8px 0; }
    .footer { background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }
    .important { color: #d32f2f; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>⚠️ Invoice Due Tomorrow</h2>
    </div>
    
    <div class="content">
      <p>Hi <strong>${invoice.customer_name}</strong>,</p>
      
      <p>This is a friendly reminder that your invoice is <strong>due tomorrow</strong>. Please make sure to arrange for payment to avoid any late fees.</p>
      
      <div class="invoice-details">
        <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
        <p><strong>Due Date:</strong> <span class="important">${dueDate}</span></p>
        <p><strong>Total Amount:</strong> ₹${invoice.amount}</p>
        <p><strong>Paid Amount:</strong> ₹${paidAmount}</p>
        <p><strong>Outstanding Amount:</strong> <span class="important">₹${remainingAmount}</span></p>
        <p><strong>Status:</strong> ${invoice.status}</p>
      </div>
      
      <p>If you have already made this payment, please disregard this message. Thank you for your prompt attention to this matter.</p>
      
    </div>
    
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
      <p>&copy; 2026 ORBEM SOLUTIONS. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `⏰ Reminder: Invoice ${invoice.invoice_number} due tomorrow`,
    html: emailBody,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Reminder email sent to ${email} for invoice ${invoice.invoice_number}`);
  } catch (error) {
    console.error(`❌ Failed to send reminder email to ${email}:`, error.message);
    throw error;
  }
}

module.exports = sendDueEmailReminder;
