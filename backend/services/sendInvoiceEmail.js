const nodemailer = require("nodemailer");

function createTransporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: String(process.env.EMAIL_PASS || "").replace(/\s+/g, ""),
    },
    requireTLS: true,
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 20000,
    tls: {
      rejectUnauthorized: false,
    },
  });
}

async function sendInvoiceEmail(email, invoice, pdfBuffer) {
  const transporter = createTransporter();
  const totalAmount = parseFloat(invoice.amount) || 0;
  const paidAmount = parseFloat(invoice.paid_amount) || 0;
  const remainingAmount = totalAmount - paidAmount;

  const emailBody = `
Hello ${invoice.customer_name},

Your invoice from ORBEM SOLUTIONS has been processed.

Invoice Details:
- Invoice Number: ${invoice.invoice_number}
- Total Amount: ₹${totalAmount.toFixed(2)}
- Paid Amount: ₹${paidAmount.toFixed(2)}
- Remaining Amount: ₹${remainingAmount.toFixed(2)}
${invoice.due_date ? `- Due Date: ${new Date(invoice.due_date).toLocaleDateString()}` : ''}
- Status: ${invoice.status.toUpperCase()}

${invoice.notes ? `Notes: ${invoice.notes}\n` : ''}
Your detailed invoice is attached as a PDF.

Thank you for your business!

  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `PayFlow Invoice - ${invoice.invoice_number}`,
      text: emailBody,
      attachments: [
        {
          filename: `invoice-${invoice.invoice_number}.pdf`,
          content: pdfBuffer,
        },
      ],
    });
  } catch (error) {
    console.error('Invoice email send failed:', error.message);
    throw error;
  }
}

module.exports = sendInvoiceEmail;