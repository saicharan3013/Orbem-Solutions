const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');
const { getActivityLogs } = require('../services/activityLogger');

// Get activity logs (admin only)
router.get('/', auth, async (req, res) => {
  try {
    // Check if user is admin
    const [users] = await db.query('SELECT role FROM users WHERE id=?', [req.user.id]);
    if (!users.length || users[0].role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can access activity logs' });
    }

    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    const { action, entity, search } = req.query;

    const { logs, total } = await getActivityLogs(limit, offset, {
      action,
      entity,
      search
    });

    res.json({
      logs,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total
      }
    });
  } catch (err) {
    console.error('Error fetching activity logs:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a specific activity log entry (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const [users] = await db.query('SELECT role FROM users WHERE id=?', [req.user.id]);
    if (!users.length || users[0].role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete activity logs' });
    }

    const logId = parseInt(req.params.id, 10);
    if (Number.isNaN(logId)) {
      return res.status(400).json({ message: 'Invalid activity log ID' });
    }

    const [result] = await db.query('DELETE FROM activity_logs WHERE id=?', [logId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Activity log not found' });
    }

    res.json({ message: 'Activity log deleted' });
  } catch (err) {
    console.error('Error deleting activity log:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
