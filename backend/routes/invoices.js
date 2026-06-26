const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');
const generateInvoicePDF = require('../services/generateInvoicePDF');
const sendInvoiceEmail = require('../services/sendInvoiceEmail');
const { logActivity } = require('../services/activityLogger');

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

// Helper function to determine status based on paid amount
const determineStatus = (amount, paidAmount, currentStatus) => {
  const paid = parseFloat(paidAmount) || 0;
  const total = parseFloat(amount) || 0;
  
  if (paid === 0) return 'draft';
  if (paid >= total) return 'paid';
  if (paid > 0 && paid < total) return 'partial_paid';
  return currentStatus || 'draft';
};

async function emailInvoiceIfPaid(invoiceId) {
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
        (i.amount - COALESCE(SUM(p.amount), 0)) as remaining_amount
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN payments p ON i.id = p.invoice_id
      LEFT JOIN quotations q ON i.quotation_id = q.id
      WHERE i.id = ?
      GROUP BY i.id, i.user_id, i.customer_id, i.quotation_id, i.invoice_number, i.amount, i.status, i.due_date, i.issue_date, i.notes, i.created_at, i.reminder_email_sent, i.due_date_email_sent, i.overdue_email_sent, i.items, i.tax_rate, i.discount, c.name, c.email, c.phone, c.gst_number, c.address, q.origin_airport, q.destination_airport
    `, [invoiceId]);

  if (!invoiceRows.length) return;
  const invoice = invoiceRows[0];
  if (!invoice.customer_email) return;

  const pdfBuffer = await generateInvoicePDF(invoice);
  await sendInvoiceEmail(invoice.customer_email, invoice, pdfBuffer);
}

// Dashboard stats
router.get('/stats', auth, async (req, res) => {
  try {
    const userIds = await getTeamUserIds(req.user.id, req.user.role);
    const placeholders = userIds.map(() => '?').join(',');
    const [[totals]] = await db.query(`
      SELECT 
        COUNT(*) as total_invoices,
        COALESCE(SUM(amount),0) as total_amount,
        COALESCE(SUM(CASE WHEN status='paid' THEN amount ELSE 0 END),0) as paid_amount,
        COALESCE(SUM(CASE WHEN status='overdue' THEN amount ELSE 0 END),0) as overdue_amount,
        COALESCE(SUM(CASE WHEN status='sent' THEN amount ELSE 0 END),0) as pending_amount
      FROM invoices WHERE user_id IN (${placeholders})`, userIds);

    const [monthly] = await db.query(`
      SELECT 
        DATE_FORMAT(created_at,'%b %Y') as month,
        SUM(amount) as total,
        SUM(CASE WHEN status='paid' THEN amount ELSE 0 END) as paid
      FROM invoices
      WHERE user_id IN (${placeholders}) AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(created_at,'%b %Y')
      ORDER BY MIN(created_at)`, userIds);

    res.json({ ...totals, monthly });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all invoices
router.get('/', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const userIds = await getTeamUserIds(req.user.id, req.user.role);
    const placeholders = userIds.map(() => '?').join(',');
    
    let query = `
      SELECT i.id, i.user_id, i.customer_id, i.quotation_id, i.invoice_number, i.amount, i.status, i.due_date, i.issue_date, i.notes, i.created_at, i.reminder_email_sent, i.due_date_email_sent, i.overdue_email_sent, i.items, i.tax_rate, i.discount,
        c.name as customer_name, c.email as customer_email,
        COALESCE(SUM(p.amount), 0) as paid_amount,
        (i.amount - COALESCE(SUM(p.amount), 0)) as remaining_amount,
        CASE WHEN i.due_date < CURDATE() AND i.status != 'paid' THEN 1 ELSE 0 END as is_overdue
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN payments p ON i.id = p.invoice_id
      WHERE i.user_id IN (${placeholders})`;
    const params = userIds;
    if (status) { query += ' AND i.status=?'; params.push(status); }
    query += ' GROUP BY i.id, i.user_id, i.customer_id, i.quotation_id, i.invoice_number, i.amount, i.status, i.due_date, i.issue_date, i.notes, i.created_at, i.reminder_email_sent, i.due_date_email_sent, i.overdue_email_sent, i.items, i.tax_rate, i.discount, c.name, c.email ORDER BY i.created_at DESC';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single invoice
router.get('/:id', auth, async (req, res) => {
  try {
    const userIds = await getTeamUserIds(req.user.id, req.user.role);
    const placeholders = userIds.map(() => '?').join(',');
    const [rows] = await db.query(`
      SELECT i.id, i.user_id, i.customer_id, i.quotation_id, i.invoice_number, i.amount, i.status, i.due_date, i.issue_date, i.notes, i.created_at, i.reminder_email_sent, i.due_date_email_sent, i.overdue_email_sent, i.items, i.tax_rate, i.discount,
        c.name as customer_name,
        COALESCE(SUM(p.amount), 0) as paid_amount,
        (i.amount - COALESCE(SUM(p.amount), 0)) as remaining_amount,
        CASE WHEN i.due_date < CURDATE() AND i.status != 'paid' THEN 1 ELSE 0 END as is_overdue
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id=c.id
      LEFT JOIN payments p ON i.id = p.invoice_id
      WHERE i.id=? AND i.user_id IN (${placeholders})
      GROUP BY i.id, i.user_id, i.customer_id, i.quotation_id, i.invoice_number, i.amount, i.status, i.due_date, i.issue_date, i.notes, i.created_at, i.reminder_email_sent, i.due_date_email_sent, i.overdue_email_sent, i.items, i.tax_rate, i.discount, c.name`, [req.params.id, ...userIds]);
    if (!rows.length) return res.status(404).json({ message: 'Invoice not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create invoice
router.post('/', auth, async (req, res) => {
  const { quotation_id, customer_id, invoice_number, amount, status, paid_amount, due_date, issue_date, notes } = req.body;
  
  // If quotation_id provided, fetch quotation details
  if (quotation_id) {
    try {
      const userIds = await getTeamUserIds(req.user.id, req.user.role);
      const placeholders = userIds.map(() => '?').join(',');
      const [quotationRows] = await db.query(
        `SELECT * FROM quotations WHERE id=? AND user_id IN (${placeholders})`,
        [quotation_id, ...userIds]
      );
      
      if (!quotationRows.length) {
        return res.status(404).json({ message: 'Quotation not found or access denied' });
      }

      const quot = quotationRows[0];
      if (quot.status !== 'accepted') {
        return res.status(400).json({ message: 'Only accepted quotations can be converted to invoices' });
      }
      const itemsJson = typeof quot.items === 'string' ? quot.items : JSON.stringify(quot.items);
      
      // Determine status based on paid_amount if provided
      let finalStatus = status || 'draft';
      if (paid_amount !== undefined && paid_amount !== '') {
        finalStatus = determineStatus(quot.estimated_amount, paid_amount, finalStatus);
      }
      
      const [result] = await db.query(
        `INSERT INTO invoices 
         (user_id, quotation_id, customer_id, invoice_number, amount, items, tax_rate, discount, status, due_date, issue_date, notes) 
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          req.user.id,
          quotation_id,
          quot.customer_id,
          invoice_number,
          quot.estimated_amount,
          itemsJson,
          quot.tax_rate,
          quot.discount,
          finalStatus,
          due_date || null,
          issue_date || null,
          notes || quot.notes || null
        ]
      );

      const invoiceId = result.insertId;

      // Create payment record if paid_amount is provided and valid
      if (paid_amount && parseFloat(paid_amount) > 0) {
        const paidAmt = parseFloat(paid_amount);
        try {
          await db.query(
            'INSERT INTO payments (user_id, invoice_id, amount, payment_date, notes) VALUES (?,?,?,?,?)',
            [req.user.id, invoiceId, paidAmt, new Date(), `Payment recorded on ${new Date().toLocaleDateString()}`]
          );
        } catch (paymentErr) {
          console.error('Failed to create payment record:', paymentErr);
        }
      }

      if (finalStatus === 'paid') {
        try {
          await emailInvoiceIfPaid(invoiceId);
        } catch (emailErr) {
          console.error('Failed to send invoice email on create:', emailErr);
        }
      }

      await logActivity(req.user.id, 'create', 'invoice', invoiceId, `Created invoice ${invoice_number} from quotation`);
      res.json({ id: invoiceId, message: 'Invoice created from quotation' });
    } catch (err) {
      console.error('Error creating invoice from quotation:', err);
      res.status(500).json({ message: 'Server error' });
    }
  } else {
    // Original behavior: create from customer_id
    if (!customer_id || !invoice_number || !amount)
      return res.status(400).json({ message: 'quotation_id OR (customer_id + invoice_number + amount) are required' });
    
    try {
      // Determine status based on paid_amount if provided
      let finalStatus = status || 'draft';
      if (paid_amount !== undefined && paid_amount !== '') {
        finalStatus = determineStatus(amount, paid_amount, finalStatus);
      }

      const [result] = await db.query(
        'INSERT INTO invoices (user_id, customer_id, invoice_number, amount, status, due_date, issue_date, notes) VALUES (?,?,?,?,?,?,?,?)',
        [req.user.id, customer_id, invoice_number, amount, finalStatus, due_date || null, issue_date || null, notes || null]
      );

      const invoiceId = result.insertId;

      // Create payment record if paid_amount is provided and valid
      if (paid_amount && parseFloat(paid_amount) > 0) {
        const paidAmt = parseFloat(paid_amount);
        try {
          await db.query(
            'INSERT INTO payments (user_id, invoice_id, amount, payment_date, notes) VALUES (?,?,?,?,?)',
            [req.user.id, invoiceId, paidAmt, new Date(), `Payment recorded on ${new Date().toLocaleDateString()}`]
          );
        } catch (paymentErr) {
          console.error('Failed to create payment record:', paymentErr);
        }
      }

      if (finalStatus === 'paid') {
        try {
          await emailInvoiceIfPaid(invoiceId);
        } catch (emailErr) {
          console.error('Failed to send invoice email on create:', emailErr);
        }
      }

      await logActivity(req.user.id, 'create', 'invoice', invoiceId, `Created invoice ${invoice_number}`);
      res.json({ id: invoiceId, message: 'Invoice created' });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

// Update invoice
router.put('/:id', auth, async (req, res) => {
  const { quotation_id, customer_id, invoice_number, amount, status, paid_amount, due_date, issue_date, notes } = req.body;
  try {
    const [existingRows] = await db.query(
      'SELECT status, amount FROM invoices WHERE id=? AND user_id=?',
      [req.params.id, req.user.id]
    );

    if (!existingRows.length) return res.status(404).json({ message: 'Invoice not found' });

    const previousStatus = existingRows[0].status;
    const invoiceAmount = existingRows[0].amount;

    // Update with quotation details if provided
    if (quotation_id) {
      const userIds = await getTeamUserIds(req.user.id, req.user.role);
      const placeholders = userIds.map(() => '?').join(',');
      const [quotationRows] = await db.query(
        `SELECT * FROM quotations WHERE id=? AND user_id IN (${placeholders})`,
        [quotation_id, ...userIds]
      );
      
      if (!quotationRows.length) {
        return res.status(404).json({ message: 'Quotation not found or access denied' });
      }

      const quot = quotationRows[0];
      if (quot.status !== 'accepted') {
        return res.status(400).json({ message: 'Only accepted quotations can be converted to invoices' });
      }
      const itemsJson = typeof quot.items === 'string' ? quot.items : JSON.stringify(quot.items);
      
      // Determine status based on paid_amount if provided
      let finalStatus = status || 'draft';
      if (paid_amount !== undefined && paid_amount !== '') {
        finalStatus = determineStatus(quot.estimated_amount, paid_amount, finalStatus);
      }
      
      await db.query(
        `UPDATE invoices SET quotation_id=?, customer_id=?, invoice_number=?, amount=?, items=?, tax_rate=?, discount=?, status=?, due_date=?, issue_date=?, notes=? WHERE id=? AND user_id=?`,
        [quotation_id, quot.customer_id, invoice_number, quot.estimated_amount, itemsJson, quot.tax_rate, quot.discount, finalStatus, due_date, issue_date, notes || quot.notes, req.params.id, req.user.id]
      );
    } else {
      // Update with provided values
      // Determine status based on paid_amount if provided
      let finalStatus = status || previousStatus;
      if (paid_amount !== undefined && paid_amount !== '') {
        finalStatus = determineStatus(amount || invoiceAmount, paid_amount, finalStatus);
      }
      
      await db.query(
        `UPDATE invoices SET customer_id=?, invoice_number=?, amount=?, status=?, due_date=?, issue_date=?, notes=? WHERE id=? AND user_id=?`,
        [customer_id, invoice_number, amount, finalStatus, due_date, issue_date, notes, req.params.id, req.user.id]
      );
    }

    await logActivity(req.user.id, 'update', 'invoice', parseInt(req.params.id), `Updated invoice ${invoice_number || req.params.id}`);
    let responseMessage = 'Invoice updated.';

    // Handle payment record creation if paid_amount is provided
    if (paid_amount && parseFloat(paid_amount) > 0) {
      const paidAmt = parseFloat(paid_amount);
      try {
        // Check if payment already exists to avoid duplicates
        const [existingPayments] = await db.query(
          'SELECT id FROM payments WHERE invoice_id=?',
          [req.params.id]
        );
        
        if (!existingPayments.length) {
          await db.query(
            'INSERT INTO payments (user_id, invoice_id, amount, payment_date, notes) VALUES (?,?,?,?,?)',
            [req.user.id, req.params.id, paidAmt, new Date(), `Payment recorded on ${new Date().toLocaleDateString()}`]
          );
        }
      } catch (paymentErr) {
        console.error('Failed to create payment record:', paymentErr);
      }
    }

    if (status === 'paid' && previousStatus !== 'paid') {
      try {
        await emailInvoiceIfPaid(req.params.id);
        responseMessage = 'Invoice updated and invoice emailed.';
      } catch (emailErr) {
        console.error('Failed to send invoice email on update:', emailErr);
        responseMessage = 'Invoice updated, but invoice email failed to send.';
      }
    }

    res.json({ message: responseMessage });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Send invoice email
router.post('/:id/send', auth, async (req, res) => {
  try {
    const [invoiceRows] = await db.query(
      `SELECT i.id, i.user_id, i.customer_id, i.quotation_id, i.invoice_number, i.amount, i.status, i.due_date, i.issue_date, i.notes, i.created_at, i.reminder_email_sent, i.due_date_email_sent, i.overdue_email_sent, i.items, i.tax_rate, i.discount,
              c.name AS customer_name, c.email AS customer_email,
              c.phone as customer_phone, c.gst_number as customer_gstin, c.address as customer_address,
              q.origin_airport AS origin, q.destination_airport AS destination,
              COALESCE(SUM(p.amount), 0) as paid_amount,
              (i.amount - COALESCE(SUM(p.amount), 0)) as remaining_amount
       FROM invoices i 
       LEFT JOIN customers c ON i.customer_id=c.id
       LEFT JOIN payments p ON i.id = p.invoice_id
       LEFT JOIN quotations q ON i.quotation_id = q.id
       WHERE i.id=?
       GROUP BY i.id, i.user_id, i.customer_id, i.quotation_id, i.invoice_number, i.amount, i.status, i.due_date, i.issue_date, i.notes, i.created_at, i.reminder_email_sent, i.due_date_email_sent, i.overdue_email_sent, i.items, i.tax_rate, i.discount,
                c.name, c.email, c.phone, c.gst_number, c.address, q.origin_airport, q.destination_airport`,
      [req.params.id]
    );

    if (!invoiceRows.length) return res.status(404).json({ message: 'Invoice not found' });

    const invoice = invoiceRows[0];
    
    // Check permission using same logic as GET endpoint
    const userIds = await getTeamUserIds(req.user.id, req.user.role);
    
    if (!userIds.includes(invoice.user_id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!invoice.customer_email) return res.status(400).json({ message: 'Customer email not available' });

    try {
      const pdfBuffer = await generateInvoicePDF(invoice);
      await sendInvoiceEmail(invoice.customer_email, invoice, pdfBuffer);
      await logActivity(req.user.id, 'update', 'invoice', parseInt(req.params.id), `Sent invoice email for invoice ${invoice.invoice_number || req.params.id}`);
      res.json({ message: 'Invoice sent successfully' });
    } catch (emailErr) {
      console.error('Failed to send invoice email:', emailErr);
      res.status(500).json({ message: 'Failed to send invoice: ' + emailErr.message });
    }
  } catch (err) {
    console.error('Send invoice error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Download invoice PDF
router.get('/:id/pdf', auth, async (req, res) => {
  try {
    const userIds = await getTeamUserIds(req.user.id, req.user.role);
    const placeholders = userIds.map(() => '?').join(',');
    const [invoiceRows] = await db.query(
      `SELECT i.id, i.user_id, i.customer_id, i.quotation_id, i.invoice_number, i.amount, i.status, i.due_date, i.issue_date, i.notes, i.created_at, i.reminder_email_sent, i.due_date_email_sent, i.overdue_email_sent, i.items, i.tax_rate, i.discount,
              c.name AS customer_name, c.email AS customer_email,
              c.phone as customer_phone, c.gst_number as customer_gstin, c.address as customer_address,
              q.origin_airport AS origin, q.destination_airport AS destination,
              COALESCE(SUM(p.amount), 0) as paid_amount,
              (i.amount - COALESCE(SUM(p.amount), 0)) as remaining_amount,
              CASE WHEN i.due_date < CURDATE() AND i.status != 'paid' THEN 1 ELSE 0 END as is_overdue
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id
       LEFT JOIN payments p ON i.id = p.invoice_id
       LEFT JOIN quotations q ON i.quotation_id = q.id
       WHERE i.id=? AND i.user_id IN (${placeholders})
       GROUP BY i.id, i.user_id, i.customer_id, i.quotation_id, i.invoice_number, i.amount, i.status, i.due_date, i.issue_date, i.notes, i.created_at, i.reminder_email_sent, i.due_date_email_sent, i.overdue_email_sent, i.items, i.tax_rate, i.discount,
                c.name, c.email, c.phone, c.gst_number, c.address, q.origin_airport, q.destination_airport`,
      [req.params.id, ...userIds]
    );

    if (!invoiceRows.length) return res.status(404).json({ message: 'Invoice not found' });

    const invoice = invoiceRows[0];
    const pdfBuffer = await generateInvoicePDF(invoice);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice_${invoice.invoice_number}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Download invoice PDF error:', err);
    res.status(500).json({ message: 'Failed to generate PDF' });
  }
});

// Delete invoice
router.delete('/:id', auth, async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM invoices WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    if (result.affectedRows > 0) {
      await logActivity(req.user.id, 'delete', 'invoice', parseInt(req.params.id), `Deleted invoice`);
    }
    res.json({ message: 'Invoice deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
