const fs = require('fs');
const path = require('path');
const db = require('../db');
const generateInvoicePDF = require('../services/generateInvoicePDF');

async function run() {
  const id = process.argv[2] || 39;
  try {
    const [rows] = await db.query(`
      SELECT i.*, c.name AS customer_name, c.email AS customer_email, c.phone as customer_phone, c.gst_number as customer_gstin, c.address as customer_address,
             COALESCE(SUM(p.amount), 0) as paid_amount
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN payments p ON i.id = p.invoice_id
      WHERE i.id=?
      GROUP BY i.id
    `, [id]);

    if (!rows.length) {
      console.error('Invoice not found', id);
      process.exit(1);
    }

    const invoice = rows[0];
    invoice.transactions = [];

    const buf = await generateInvoicePDF(invoice);
    const out = path.join(__dirname, `invoice_${id}_test.pdf`);
    fs.writeFileSync(out, buf);
    console.log('Wrote PDF to', out);
  } catch (e) {
    console.error('Error:', e.message || e);
    process.exit(1);
  }
}

run();
