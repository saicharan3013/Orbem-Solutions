const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');
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

// Get all quotations
router.get('/', auth, async (req, res) => {
  try {
    const userIds = await getTeamUserIds(req.user.id, req.user.role);
    const placeholders = userIds.map(() => '?').join(',');
    const [rows] = await db.query(`
      SELECT q.*, c.name as customer_name, c.email as customer_email
      FROM quotations q
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.user_id IN (${placeholders})
      ORDER BY q.created_at DESC
    `, userIds);
    
    // Parse JSON items for each quotation
    const quotations = rows.map(q => ({
      ...q,
      items: q.items ? (typeof q.items === 'string' ? JSON.parse(q.items) : q.items) : []
    }));
    
    res.json(quotations);
  } catch (err) {
    console.error('Error fetching quotations:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single quotation
router.get('/:id', auth, async (req, res) => {
  try {
    const userIds = await getTeamUserIds(req.user.id, req.user.role);
    const placeholders = userIds.map(() => '?').join(',');
    const [rows] = await db.query(`
      SELECT q.*, c.name as customer_name, c.email as customer_email
      FROM quotations q
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.id = ? AND q.user_id IN (${placeholders})
    `, [req.params.id, ...userIds]);
    
    if (!rows.length) return res.status(404).json({ message: 'Quotation not found' });
    
    const quotation = {
      ...rows[0],
      items: rows[0].items ? (typeof rows[0].items === 'string' ? JSON.parse(rows[0].items) : rows[0].items) : []
    };
    
    res.json(quotation);
  } catch (err) {
    console.error('Error fetching quotation:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create quotation
router.post('/', auth, async (req, res) => {
  try {
    const { customer_id, quotation_number, items, tax_rate, discount, validity_days, notes, status, origin_airport, destination_airport } = req.body;
    
    console.log('Creating quotation with data:', { customer_id, quotation_number, items, user_id: req.user.id });
    
    if (!customer_id || !quotation_number) {
      return res.status(400).json({ message: 'Customer and quotation number are required' });
    }

    if (!origin_airport || !destination_airport) {
      return res.status(400).json({ message: 'Origin airport and destination airport are required' });
    }
    
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'At least one line item is required' });
    }
    
    // Calculate total amount
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const tax = (subtotal * (tax_rate || 0)) / 100;
    const estimated_amount = subtotal + tax - (discount || 0);
    
    console.log('Calculated amount:', { subtotal, tax, estimated_amount });
    
    const [result] = await db.query(`
      INSERT INTO quotations (user_id, customer_id, quotation_number, items, tax_rate, discount, validity_days, estimated_amount, origin_airport, destination_airport, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      req.user.id,
      customer_id,
      quotation_number,
      JSON.stringify(items),
      tax_rate || 0,
      discount || 0,
      validity_days || 30,
      estimated_amount,
      origin_airport || null,
      destination_airport || null,
      status || 'draft',
      notes || ''
    ]);
    
    console.log('Quotation created with ID:', result.insertId);
    
    await logActivity(req.user.id, 'create', 'quotation', result.insertId, `Created quotation ${quotation_number}`);
    
    res.status(201).json({ 
      id: result.insertId, 
      message: 'Quotation created successfully' 
    });
  } catch (err) {
    console.error('Error creating quotation:', err.message, err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update quotation
router.put('/:id', auth, async (req, res) => {
  try {
    const { customer_id, quotation_number, items, tax_rate, discount, validity_days, notes, status, origin_airport, destination_airport } = req.body;
    
    if (!origin_airport || !destination_airport) {
      return res.status(400).json({ message: 'Origin airport and destination airport are required' });
    }

    const userIds = await getTeamUserIds(req.user.id, req.user.role);
    const placeholders = userIds.map(() => '?').join(',');
    
    // Verify ownership
    const [existing] = await db.query(`SELECT id FROM quotations WHERE id = ? AND user_id IN (${placeholders})`, [req.params.id, ...userIds]);
    if (!existing.length) return res.status(404).json({ message: 'Quotation not found' });
    
    // Calculate total amount
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const tax = (subtotal * (tax_rate || 0)) / 100;
    const estimated_amount = subtotal + tax - (discount || 0);
    
    const [result] = await db.query(`
      UPDATE quotations 
      SET customer_id = ?, quotation_number = ?, items = ?, tax_rate = ?, discount = ?, validity_days = ?, estimated_amount = ?, origin_airport = ?, destination_airport = ?, status = ?, notes = ?, updated_at = NOW()
      WHERE id = ? AND user_id IN (${placeholders})
    `, [
      customer_id,
      quotation_number,
      JSON.stringify(items),
      tax_rate || 0,
      discount || 0,
      validity_days || 30,
      estimated_amount,
      origin_airport || null,
      destination_airport || null,
      status || 'draft',
      notes || '',
      req.params.id,
      ...userIds
    ]);
    
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Quotation not found or access denied' });
    await logActivity(req.user.id, 'update', 'quotation', parseInt(req.params.id), `Updated quotation ${quotation_number}`);
    res.json({ message: 'Quotation updated successfully' });
  } catch (err) {
    console.error('Error updating quotation:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete quotation
router.delete('/:id', auth, async (req, res) => {
  try {
    const userIds = await getTeamUserIds(req.user.id, req.user.role);
    const placeholders = userIds.map(() => '?').join(',');
    const [result] = await db.query(`DELETE FROM quotations WHERE id = ? AND user_id IN (${placeholders})`, [req.params.id, ...userIds]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Quotation not found or access denied' });
    }
    
    await logActivity(req.user.id, 'delete', 'quotation', parseInt(req.params.id), `Deleted quotation`);
    res.json({ message: 'Quotation deleted successfully' });
  } catch (err) {
    console.error('Error deleting quotation:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Convert quotation to invoice
router.post('/:id/convert-to-invoice', auth, async (req, res) => {
  try {
    const userIds = await getTeamUserIds(req.user.id, req.user.role);
    const placeholders = userIds.map(() => '?').join(',');
    
    // Get the quotation
    const [quotations] = await db.query(`
      SELECT q.*, c.name as customer_name
      FROM quotations q
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.id = ? AND q.user_id IN (${placeholders})
    `, [req.params.id, ...userIds]);
    
    if (!quotations.length) {
      return res.status(404).json({ message: 'Quotation not found' });
    }
    
    const quotation = quotations[0];
    
    if (quotation.status !== 'accepted') {
      return res.status(400).json({ message: 'Only accepted quotations can be converted to invoices' });
    }
    
    // Create invoice from quotation
    const invoiceNumber = 'INV-' + Date.now().toString().slice(-6);
    const issueDate = new Date().toISOString().split('T')[0];
    
    // Copy items, tax_rate, discount, and quotation_id from the quotation to the invoice
    const itemsJson = typeof quotation.items === 'string' ? quotation.items : JSON.stringify(quotation.items);

    const [result] = await db.query(`
      INSERT INTO invoices (user_id, quotation_id, customer_id, invoice_number, amount, items, tax_rate, discount, status, issue_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sent', ?, ?)
    `, [
      req.user.id,
      quotation.id,
      quotation.customer_id,
      invoiceNumber,
      quotation.estimated_amount,
      itemsJson,
      quotation.tax_rate || 0,
      quotation.discount || 0,
      issueDate,
      `Converted from quotation ${quotation.quotation_number}\n${quotation.notes || ''}`
    ]);
    
    await logActivity(req.user.id, 'create', 'invoice', result.insertId, `Created invoice ${invoiceNumber} from quotation ${quotation.quotation_number}`);

    // Update quotation status to rejected to prevent duplicate conversions
    await db.query(`
      UPDATE quotations 
      SET status = 'rejected'
      WHERE id = ?
    `, [req.params.id]);

    await logActivity(req.user.id, 'update', 'quotation', parseInt(req.params.id), `Converted quotation ${quotation.quotation_number} to invoice ${invoiceNumber}`);
    
    res.json({ 
      id: result.insertId, 
      message: 'Invoice created successfully from quotation',
      invoiceNumber: invoiceNumber
    });
  } catch (err) {
    console.error('Error converting quotation to invoice:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
