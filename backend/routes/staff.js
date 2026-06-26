const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const auth = require('../middleware/auth');
const { logActivity } = require('../services/activityLogger');

// Middleware to check if user is admin
const checkAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Get all staff (admin only)
router.get('/', auth, checkAdmin, async (req, res) => {
  try {
    const [staff] = await db.query(
      `SELECT id, name, email, role, created_at 
       FROM users 
       WHERE role='staff' AND created_by=?`,
      [req.user.id]
    );
    
    // Get permissions for each staff
    for (let s of staff) {
      const [perms] = await db.query(
        'SELECT section, can_view, can_edit, can_delete FROM staff_permissions WHERE staff_id=?',
        [s.id]
      );
      s.permissions = perms;
    }
    
    res.json(staff);
  } catch (err) {
    console.error('Get staff error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single staff member (admin only)
router.get('/:id', auth, checkAdmin, async (req, res) => {
  try {
    const [staff] = await db.query(
      `SELECT id, name, email, role, created_at 
       FROM users 
       WHERE id=? AND role='staff' AND created_by=?`,
      [req.params.id, req.user.id]
    );
    
    if (!staff.length) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    
    const [perms] = await db.query(
      'SELECT section, can_view, can_edit, can_delete FROM staff_permissions WHERE staff_id=?',
      [req.params.id]
    );
    
    staff[0].permissions = perms;
    res.json(staff[0]);
  } catch (err) {
    console.error('Get staff error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add new staff member (admin only)
router.post('/', auth, checkAdmin, async (req, res) => {
  const { name, email, password, permissions } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password required' });
  }
  
  try {
    // Check if email already exists
    const [existing] = await db.query('SELECT id FROM users WHERE email=?', [email]);
    if (existing.length) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    
    // Hash password
    const hash = await bcrypt.hash(password, 10);
    
    // Insert staff member
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role, created_by) VALUES (?,?,?,?,?)',
      [name, email, hash, 'staff', req.user.id]
    );
    
    const staffId = result.insertId;
    
    // Add permissions if provided
    if (permissions && Array.isArray(permissions)) {
      for (let perm of permissions) {
        await db.query(
          `INSERT INTO staff_permissions (staff_id, section, can_view, can_edit, can_delete)
           VALUES (?,?,?,?,?)`,
          [staffId, perm.section, perm.can_view || false, perm.can_edit || false, perm.can_delete || false]
        );
      }
    }

    await logActivity(req.user.id, 'create', 'staff', staffId, `Created staff member ${name}`);
    
    res.status(201).json({ 
      message: 'Staff member added successfully',
      staffId: staffId,
      name: name,
      email: email
    });
  } catch (err) {
    console.error('Add staff error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update staff member (admin only)
router.put('/:id', auth, checkAdmin, async (req, res) => {
  const { name, email, permissions } = req.body;
  
  try {
    // Check if staff exists and belongs to this admin
    const [staff] = await db.query(
      'SELECT id FROM users WHERE id=? AND role=? AND created_by=?',
      [req.params.id, 'staff', req.user.id]
    );
    
    if (!staff.length) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    
    // Update staff details
    if (name || email) {
      let query = 'UPDATE users SET ';
      let values = [];
      
      if (name && email) {
        query += 'name=?, email=? WHERE id=?';
        values = [name, email, req.params.id];
      } else if (name) {
        query += 'name=? WHERE id=?';
        values = [name, req.params.id];
      } else {
        query += 'email=? WHERE id=?';
        values = [email, req.params.id];
      }
      
      await db.query(query, values);
    }
    
    // Update permissions if provided
    if (permissions && Array.isArray(permissions)) {
      // Delete existing permissions
      await db.query('DELETE FROM staff_permissions WHERE staff_id=?', [req.params.id]);
      
      // Add new permissions
      for (let perm of permissions) {
        await db.query(
          `INSERT INTO staff_permissions (staff_id, section, can_view, can_edit, can_delete)
           VALUES (?,?,?,?,?)`,
          [req.params.id, perm.section, perm.can_view || false, perm.can_edit || false, perm.can_delete || false]
        );
      }
    }
    
    await logActivity(req.user.id, 'update', 'staff', parseInt(req.params.id), `Updated staff member ${name || email || req.params.id}`);
    res.json({ message: 'Staff member updated successfully' });
  } catch (err) {
    console.error('Update staff error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete staff member (admin only)
router.delete('/:id', auth, checkAdmin, async (req, res) => {
  try {
    // Check if staff exists and belongs to this admin
    const [staff] = await db.query(
      'SELECT id FROM users WHERE id=? AND role=? AND created_by=?',
      [req.params.id, 'staff', req.user.id]
    );
    
    if (!staff.length) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    
    // Delete staff member (cascades delete permissions)
    await db.query('DELETE FROM users WHERE id=?', [req.params.id]);
    await logActivity(req.user.id, 'delete', 'staff', parseInt(req.params.id), 'Deleted staff member');
    
    res.json({ message: 'Staff member deleted successfully' });
  } catch (err) {
    console.error('Delete staff error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update staff permissions (admin only)
router.post('/:id/permissions', auth, checkAdmin, async (req, res) => {
  const { permissions } = req.body;
  
  if (!Array.isArray(permissions)) {
    return res.status(400).json({ message: 'Permissions must be an array' });
  }
  
  try {
    // Check if staff exists
    const [staff] = await db.query(
      'SELECT id FROM users WHERE id=? AND role=? AND created_by=?',
      [req.params.id, 'staff', req.user.id]
    );
    
    if (!staff.length) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    
    // Delete existing permissions
    await db.query('DELETE FROM staff_permissions WHERE staff_id=?', [req.params.id]);
    
    // Add new permissions
    for (let perm of permissions) {
      await db.query(
        `INSERT INTO staff_permissions (staff_id, section, can_view, can_edit, can_delete)
         VALUES (?,?,?,?,?)`,
        [req.params.id, perm.section, perm.can_view || false, perm.can_edit || false, perm.can_delete || false]
      );
    }
    
    await logActivity(req.user.id, 'update', 'staff', parseInt(req.params.id), 'Updated staff permissions');
    res.json({ message: 'Permissions updated successfully' });
  } catch (err) {
    console.error('Update permissions error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
