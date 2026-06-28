const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');
const { logActivity } = require('../services/activityLogger');

const generateInvoicePDF = require('../services/generateInvoicePDF');
const sendInvoiceEmail = require('../services/sendInvoiceEmail');

// Helper function to get all team member IDs (self + team members)
// For admin: returns [adminId, ...staffIds created by admin]
// For staff: returns [staffId, adminId who created staff]
const getTeamUserIds = async (userId, userRole) => {
  const ids = [userId];
  
  if (userRole === 'admin') {
    try {
      const [staffMembers] = await db.query(
        'SELECT id FROM users WHERE role=? AND created_by=?',
        ['staff', userId]
      );
      staffMembers.forEach(staff => ids.push(staff.id));
    } catch (err) {
      console.error('Error getting staff members:', err);
    }
  } else if (userRole === 'staff') {
    try {
      const [adminData] = await db.query(
        'SELECT created_by FROM users WHERE id=?',
        [userId]
      );
      if (adminData.length && adminData[0].created_by) {
        ids.push(adminData[0].created_by);
      }
    } catch (err) {
      console.error('Error getting admin:', err);
    }
  }
  
  return ids;
};

// Get all payments
router.get('/', auth, async (req, res) => {
  try {
    const userIds = await getTeamUserIds(req.user.id, req.user.role);
    const placeholders = userIds.map(() => '?').join(',');
    const [rows] = await db.query(`
      SELECT p.*, i.invoice_number, i.amount as invoice_amount, c.name as customer_name 
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id = i.id
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE p.user_id IN (${placeholders}) ORDER BY p.created_at DESC`, userIds);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create payment
router.post('/', auth, async (req, res) => {
  const { invoice_id, amount, payment_date, method, notes } = req.body;

  if (!invoice_id || !amount || !payment_date)
    return res.status(400).json({
      message: 'invoice_id, amount and payment_date are required'
    });

  try {

    const [result] = await db.query(
      'INSERT INTO payments (user_id,invoice_id,amount,payment_date,method,notes) VALUES (?,?,?,?,?,?)',
      [
        req.user.id,
        invoice_id,
        amount,
        payment_date,
        method || 'cash',
        notes || null
      ]
    );

    await logActivity(req.user.id, 'create', 'payment', result.insertId, `Recorded payment of ₹${amount} for invoice #${invoice_id}`);

    // Get invoice + customer details with updated payment aggregation
    const [invoiceRows] = await db.query(`
      SELECT
        i.id,
        i.user_id,
        i.customer_id,
        i.quotation_id,
        i.invoice_number,
        i.amount,
        i.status,
        i.due_date,
        i.issue_date,
        i.notes,
        i.created_at,
        i.reminder_email_sent,
        i.due_date_email_sent,
        i.overdue_email_sent,
        i.items,
        i.tax_rate,
        i.discount,
        c.name AS customer_name,
        c.email AS customer_email,
        c.phone as customer_phone,
        c.gst_number as customer_gstin,
        c.address as customer_address,
        q.origin_airport AS origin,
        q.destination_airport AS destination,
        COALESCE(SUM(p.amount), 0) as paid_amount,
        (i.amount - COALESCE(SUM(p.amount), 0)) as remaining_amount,
        CASE WHEN i.due_date < CURDATE() AND i.status != 'paid' THEN 1 ELSE 0 END as is_overdue
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN payments p ON i.id = p.invoice_id
      LEFT JOIN quotations q ON i.quotation_id = q.id
      WHERE i.id = ?
      GROUP BY i.id, i.user_id, i.customer_id, i.quotation_id, i.invoice_number, i.amount, i.status, i.due_date, i.issue_date, i.notes, i.created_at, i.reminder_email_sent, i.due_date_email_sent, i.overdue_email_sent, i.items, i.tax_rate, i.discount, c.name, c.email, c.phone, c.gst_number, c.address, q.origin_airport, q.destination_airport
    `, [invoice_id]);

    // Only set status to 'paid' if payment covers full invoice amount
    if (invoiceRows.length > 0) {
      const invoice = invoiceRows[0];
      const isPaid = invoice.paid_amount >= invoice.amount;
      if (isPaid) {
        await db.query(
          "UPDATE invoices SET status='paid' WHERE id=? AND user_id=?",
          [invoice_id, req.user.id]
        );
        await logActivity(req.user.id, 'update', 'invoice', invoice_id, `Marked invoice #${invoice_id} as paid`);
      }
    }

    let emailMessage = 'Payment recorded.';

    if (invoiceRows.length > 0) {
      const invoice = invoiceRows[0];

      if (invoice.customer_email) {
        try {
          const pdfBuffer = await generateInvoicePDF(invoice);
          await sendInvoiceEmail(invoice.customer_email, invoice, pdfBuffer);
          console.log('Invoice email sent to:', invoice.customer_email);
          emailMessage = 'Payment recorded and invoice emailed.';
        } catch (emailErr) {
          console.error('Failed to send invoice email:', emailErr);
          emailMessage = 'Payment recorded, but invoice email failed to send.';
        }
      } else {
        console.warn('Invoice payment saved but customer has no email:', invoice_id);
        emailMessage = 'Payment recorded. Invoice email not sent because customer has no email address.';
      }
    } else {
      console.warn('Invoice payment saved but invoice not found for email:', invoice_id);
    }

    res.json({
      id: result.insertId,
      message: emailMessage
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: 'Server error'
    });
  }
});

// Delete payment
router.delete('/:id', auth, async (req, res) => {
  try {
    const userIds = await getTeamUserIds(req.user.id, req.user.role);
    const placeholders = userIds.map(() => '?').join(',');
    
    // Get invoice_id before deleting
    const [rows] = await db.query(`SELECT invoice_id FROM payments WHERE id=? AND user_id IN (${placeholders})`, [req.params.id, ...userIds]);
    if (rows.length) {
      await db.query(`DELETE FROM payments WHERE id=? AND user_id IN (${placeholders})`, [req.params.id, ...userIds]);
      await logActivity(req.user.id, 'delete', 'payment', parseInt(req.params.id), `Deleted payment for invoice #${rows[0].invoice_id}`);
      // Revert invoice status to sent
      const [invoiceRows] = await db.query('SELECT user_id FROM invoices WHERE id=?', [rows[0].invoice_id]);
      if (invoiceRows.length) {
        await db.query("UPDATE invoices SET status='sent' WHERE id=? AND user_id IN (?)", [rows[0].invoice_id, ...userIds]);
      }
    }
    res.json({ message: 'Payment deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
