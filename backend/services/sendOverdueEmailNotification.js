const { sendMail } = require('./emailService');

/**
 * Send overdue notification email for invoices past their due date
 */
async function sendOverdueEmailNotification(email, invoice) {

  const dueDate = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'N/A';

  const remainingAmount = parseFloat(invoice.remaining_amount || invoice.amount);
  const paidAmount = parseFloat(invoice.paid_amount || 0);

  const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
    .header { background-color: #c62828; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .header h2 { margin: 0; }
    .alert { background-color: #ffebee; border-left: 4px solid #c62828; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .alert h3 { color: #c62828; margin: 0 0 10px 0; }
    .content { padding: 20px; }
    .invoice-details { background-color: #fff3e0; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #f57c00; }
    .invoice-details p { margin: 8px 0; font-weight: bold; }
    .invoice-details .label { color: #666; font-size: 14px; }
    .footer { background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>⚠️ INVOICE OVERDUE</h2>
    </div>
    <div class="content">
      <p>Dear ${invoice.customer_name},</p>
      
      <div class="alert">
        <h3>Your invoice payment is now OVERDUE!</h3>
        <p>Immediate payment is required to avoid late fees and service interruption.</p>
      </div>

      <h3>Invoice Details:</h3>
      <div class="invoice-details">
        <p>
          <span class="label">Invoice Number:</span><br>
          ${invoice.invoice_number}
        </p>
        <p>
          <span class="label">Due Date:</span><br>
          ${dueDate}
        </p>
        <p>
          <span class="label">Total Amount:</span><br>
          ₹${parseFloat(invoice.amount).toFixed(2)}
        </p>
        <p>
          <span class="label">Paid Amount:</span><br>
          ₹${paidAmount.toFixed(2)}
        </p>
        <p>
          <span class="label">Outstanding Amount:</span><br>
          <strong style="color: #c62828; font-size: 18px;">₹${remainingAmount.toFixed(2)}</strong>
        </p>
        <p>
          <span class="label">Status:</span><br>
          <strong style="color: #c62828;">OVERDUE</strong>
        </p>
      </div>

      <h3>Action Required:</h3>
      <p>Please remit the outstanding amount of <strong>₹${remainingAmount.toFixed(2)}</strong> immediately to:</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>ORBEM SOLUTIONS</strong></p>
        <p>For payment inquiries, please contact our billing department.</p>
      </div>

      <p style="color: #d32f2f; font-weight: bold;">If payment has already been made, please disregard this notice and contact us for confirmation.</p>

      <p>Thank you for your immediate attention to this matter.</p>
      <p>Best regards,<br><strong>ORBEM SOLUTIONS</strong></p>
    </div>
    <div class="footer">
      <p>This is an automated notification. Please do not reply to this email.</p>
      <p>© 2026 ORBEM SOLUTIONS. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `⚠️ URGENT: Invoice ${invoice.invoice_number} is OVERDUE - Immediate Payment Required`,
    html: emailBody,
  };

  try {
    await sendMail(mailOptions);
    console.log(`✅ Sent overdue notification for invoice ${invoice.invoice_number} to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send overdue notification:`, error);
    throw error;
  }
}

module.exports = sendOverdueEmailNotification;
