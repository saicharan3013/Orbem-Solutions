const db = require('../db');

/**
 * Log an activity/action
 * @param {number} userId - User ID performing the action
 * @param {string} actionType - Type of action: 'create', 'update', 'delete'
 * @param {string} entityType - Type of entity: 'customer', 'invoice', 'quotation', 'payment', 'staff'
 * @param {number} entityId - ID of the entity
 * @param {string} description - Human-readable description of the action
 */
async function logActivity(userId, actionType, entityType, entityId, description) {
  try {
    await db.query(
      'INSERT INTO activity_logs (user_id, action_type, entity_type, entity_id, description) VALUES (?,?,?,?,?)',
      [userId, actionType, entityType, entityId, description]
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
    // Don't throw - logging failure shouldn't break the main operation
  }
}

/**
 * Get activity logs with optional filtering
 * @param {number} limit - Number of records to fetch (default 50)
 * @param {number} offset - Pagination offset (default 0)
 */
async function getActivityLogs(limit = 50, offset = 0, filters = {}) {
  try {
    const whereClauses = [];
    const params = [];

    if (filters.action) {
      whereClauses.push('a.action_type = ?');
      params.push(filters.action);
    }

    if (filters.entity) {
      whereClauses.push('a.entity_type = ?');
      params.push(filters.entity);
    }

    if (filters.search) {
      const searchTerm = `%${filters.search.trim()}%`;
      whereClauses.push(
        `(a.description LIKE ? OR a.entity_type LIKE ? OR u.name LIKE ? OR u.email LIKE ?)`
      );
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [logs] = await db.query(
      `SELECT 
        a.id,
        a.user_id,
        a.action_type,
        a.entity_type,
        a.entity_id,
        a.description,
        a.created_at,
        u.name as user_name,
        u.email as user_email
      FROM activity_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const countParams = [...params];
    const countQuery = `SELECT COUNT(*) as total FROM activity_logs a LEFT JOIN users u ON a.user_id = u.id ${whereClause}`;
    const [[{ total }]] = await db.query(countQuery, countParams);

    return { logs, total };
  } catch (err) {
    console.error('Failed to fetch activity logs:', err);
    return { logs: [], total: 0 };
  }
}

module.exports = { logActivity, getActivityLogs };
