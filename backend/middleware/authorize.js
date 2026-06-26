const jwt = require('jsonwebtoken');

// Check if user is admin
const requireAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Check if user has permission for a specific section
const requirePermission = (section) => {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Admins have access to everything
      if (decoded.role === 'admin') {
        req.user = decoded;
        return next();
      }
      
      // Check staff permissions
      if (decoded.role === 'staff') {
        const db = require('../db');
        const [perms] = await db.query(
          'SELECT * FROM staff_permissions WHERE staff_id=? AND section=? AND can_view=1',
          [decoded.id, section]
        );
        if (!perms.length) {
          return res.status(403).json({ message: `No access to ${section}` });
        }
      }
      
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ message: 'Token is not valid' });
    }
  };
};

module.exports = { requireAdmin, requirePermission };
