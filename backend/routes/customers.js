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

// Get all customers
router.get('/', auth, async (req, res) => {
  try {
    const userIds = await getTeamUserIds(req.user.id, req.user.role);
    const placeholders = userIds.map(() => '?').join(',');
    const [rows] = await db.query(
      `SELECT * FROM customers WHERE user_id IN (${placeholders}) ORDER BY created_at DESC`,
      userIds
    );
    res.json(rows);
  } catch (err) {
    console.error('Get customers error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single customer
router.get('/:id', auth, async (req, res) => {
  try {
    const userIds = await getTeamUserIds(req.user.id, req.user.role);
    const placeholders = userIds.map(() => '?').join(',');
    const [rows] = await db.query(
      `SELECT * FROM customers WHERE id=? AND user_id IN (${placeholders})`,
      [req.params.id, ...userIds]
    );
    if (!rows.length) return res.status(404).json({ message: 'Customer not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create customer
router.post('/', auth, async (req, res) => {
  const { name, email, phone, company, address, gst_number, city, county } = req.body;
  if (!name) return res.status(400).json({ message: 'Name is required' });
  try {
    const [result] = await db.query(
      'INSERT INTO customers (user_id,name,email,phone,company,address,gst_number,city,county) VALUES (?,?,?,?,?,?,?,?,?)',
      [req.user.id, name, email || null, phone || null, company || null, address || null, gst_number || null, city || null, county || null]
    );
    const customerId = result.insertId;
    await logActivity(req.user.id, 'create', 'customer', customerId, `Added customer: ${name}`);
    res.json({ id: customerId, message: 'Customer created' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update customer
router.put('/:id', auth, async (req, res) => {
  const { name, email, phone, company, address, gst_number, city, county } = req.body;
  try {
    const userIds = await getTeamUserIds(req.user.id, req.user.role);
    const placeholders = userIds.map(() => '?').join(',');
    const [result] = await db.query(
      `UPDATE customers SET name=?,email=?,phone=?,company=?,address=?,gst_number=?,city=?,county=? WHERE id=? AND user_id IN (${placeholders})`,
      [name, email || null, phone || null, company || null, address || null, gst_number || null, city || null, county || null, req.params.id, ...userIds]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Customer not found or access denied' });
    await logActivity(req.user.id, 'update', 'customer', parseInt(req.params.id), `Updated customer: ${name}`);
    res.json({ message: 'Customer updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete customer
router.delete('/:id', auth, async (req, res) => {
  try {
    const userIds = await getTeamUserIds(req.user.id, req.user.role);
    const placeholders = userIds.map(() => '?').join(',');
    const [result] = await db.query(
      `DELETE FROM customers WHERE id=? AND user_id IN (${placeholders})`,
      [req.params.id, ...userIds]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Customer not found or access denied' });
    await logActivity(req.user.id, 'delete', 'customer', parseInt(req.params.id), `Deleted customer`);
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
