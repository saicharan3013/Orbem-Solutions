const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

// Register - For regular users (backward compatibility)
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: 'All fields required' });
  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email=?', [email]);
    if (existing.length) return res.status(400).json({ message: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    await db.query('INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)', [name, email, hash, 'staff']);
    res.json({ message: 'Registered successfully' });
  } catch (err) {
    console.error('Auth register error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login with automatic role detection
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'All fields required' });
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email=?', [email]);
    if (!rows.length) return res.status(400).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, rows[0].password);
    if (!valid) return res.status(400).json({ message: 'Invalid credentials' });
    
    const token = jwt.sign(
      { 
        id: rows[0].id, 
        name: rows[0].name, 
        email: rows[0].email,
        role: rows[0].role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Get permissions if staff
    let permissions = null;
    if (rows[0].role === 'staff') {
      const [perms] = await db.query('SELECT * FROM staff_permissions WHERE staff_id=?', [rows[0].id]);
      permissions = perms;
    }
    
    res.json({ 
      token, 
      user: { 
        id: rows[0].id, 
        name: rows[0].name, 
        email: rows[0].email,
        role: rows[0].role
      },
      permissions
    });
  } catch (err) {
    console.error('Auth login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user with permissions
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id,name,email,role,created_by,created_at,phone,company,gst_number,address,website FROM users WHERE id=?', [req.user.id]);
    const user = rows[0];

    // If staff, get their permissions
    if (user.role === 'staff') {
      const [perms] = await db.query('SELECT * FROM staff_permissions WHERE staff_id=?', [user.id]);
      user.permissions = perms;
    }

    res.json(user);
  } catch (err) {
    console.error('Auth me error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update staff profile (name only)
router.put('/update-profile', require('../middleware/auth'), async (req, res) => {
  const { name, phone, company, gst_number, address, website } = req.body;
  if (!name && !phone && !company && !gst_number && !address && !website) return res.status(400).json({ message: 'No profile fields provided' });

  try {
    // Build dynamic update
    const fields = [];
    const params = [];
    if (name !== undefined) { fields.push('name=?'); params.push(name); }
    if (phone !== undefined) { fields.push('phone=?'); params.push(phone); }
    if (company !== undefined) { fields.push('company=?'); params.push(company); }
    if (gst_number !== undefined) { fields.push('gst_number=?'); params.push(gst_number); }
    if (address !== undefined) { fields.push('address=?'); params.push(address); }
    if (website !== undefined) { fields.push('website=?'); params.push(website); }

    params.push(req.user.id);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id=?`;
    await db.query(sql, params);
    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update password
router.put('/update-password', require('../middleware/auth'), async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) 
    return res.status(400).json({ message: 'All fields required' });
  
  try {
    const [rows] = await db.query('SELECT password FROM users WHERE id=?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ message: 'User not found' });
    
    const valid = await bcrypt.compare(oldPassword, rows[0].password);
    if (!valid) return res.status(400).json({ message: 'Current password is incorrect' });
    
    const hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password=? WHERE id=?', [hash, req.user.id]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Update password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
