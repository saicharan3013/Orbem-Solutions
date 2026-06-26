const nodemailer = require('nodemailer');

/**
 * Send a due date notification email for invoices due today
 */
async function sendDueEmailNotification(email, invoice) {
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
    .header { background-color: #d32f2f; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .header h2 { margin: 0; }
    .content { padding: 20px; }
    .invoice-details { background-color: #ffe0e0; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #d32f2f; }
    .invoice-details p { margin: 8px 0; }
    .footer { background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }
    .urgent { color: #d32f2f; font-weight: bold; font-size: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🔴 Invoice Due Today</h2>
    </div>
    
    <div class="content">
      <p>Hi <strong>${invoice.customer_name}</strong>,</p>
      
      <p><span class="urgent">⚠️ Your invoice is DUE TODAY!</span></p>
      
      <p>Please arrange immediate payment for the outstanding amount to avoid late charges and maintain good standing with ORBEM SOLUTIONS.</p>
      
      <div class="invoice-details">
        <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
        <p><strong>Due Date:</strong> <span class="urgent">${dueDate} (TODAY)</span></p>
        <p><strong>Total Amount:</strong> ₹${invoice.amount}</p>
        <p><strong>Paid Amount:</strong> ₹${paidAmount}</p>
        <p><strong>Outstanding Amount:</strong> <span class="urgent">₹${remainingAmount}</span></p>
        <p><strong>Status:</strong> ${invoice.status}</p>
      </div>
      
      <p><strong>Payment Methods:</strong></p>
      <ul>
        <li>Bank Transfer</li>
        <li>Debit/Credit Card</li>
        <li>UPI</li>
        <li>Cash</li>
      </ul>
      
      <p>If you have already made this payment or have any questions regarding this invoice, please contact us immediately.</p>
      
      <p>Thank you,<br>
      <strong>ORBEM SOLUTIONS</strong><br>
      Customer Invoice & Payment Tracker</p>
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
    subject: `🔴 URGENT: Invoice ${invoice.invoice_number} is due TODAY`,
    html: emailBody,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Due date notification sent to ${email} for invoice ${invoice.invoice_number}`);
  } catch (error) {
    console.error(`❌ Failed to send due notification to ${email}:`, error.message);
    throw error;
  }
}

module.exports = sendDueEmailNotification;
