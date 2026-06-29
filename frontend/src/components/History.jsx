import React, { useState, useEffect } from 'react';
import api from '../api';
import './History.css';

export default function History({ isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalLogs, setTotalLogs] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const logsPerPage = 20;

  useEffect(() => {
    if (isOpen) {
      fetchActivityLogs({ page: currentPage });
    }
  }, [isOpen, currentPage]);

  const fetchActivityLogs = async ({ page = currentPage, search = searchText, action = actionFilter, entity = entityFilter } = {}) => {
    setLoading(true);
    try {
      const offset = page * logsPerPage;
      const params = {
        limit: logsPerPage,
        offset,
      };

      if (search.trim()) {
        params.search = search.trim();
      }
      if (action !== 'all') {
        params.action = action;
      }
      if (entity !== 'all') {
        params.entity = entity;
      }

      const res = await api.get('/activity-logs', { params });

      setLogs(res.data.logs);
      setTotalLogs(res.data.pagination.total);
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
      setLogs([]);
      setTotalLogs(0);
    } finally {
      setLoading(false);
    }
  };

  const deleteLog = async (id) => {
    if (!window.confirm('Delete this activity log entry?')) {
      return;
    }

    try {
      await api.delete(`/activity-logs/${id}`);
      fetchActivityLogs({ page: currentPage });
    } catch (err) {
      console.error('Failed to delete activity log:', err);
      window.alert('Failed to delete activity log.');
    }
  };

  const handleSearchChange = async (value) => {
    setSearchText(value);
    setCurrentPage(0);
    await fetchActivityLogs({ page: 0, search: value, action: actionFilter, entity: entityFilter });
  };

  const handleActionChange = async (value) => {
    setActionFilter(value);
    setCurrentPage(0);
    await fetchActivityLogs({ page: 0, search: searchText, action: value, entity: entityFilter });
  };

  const handleEntityChange = async (value) => {
    setEntityFilter(value);
    setCurrentPage(0);
    await fetchActivityLogs({ page: 0, search: searchText, action: actionFilter, entity: value });
  };

  const resetFilters = async () => {
    setSearchText('');
    setActionFilter('all');
    setEntityFilter('all');
    setCurrentPage(0);
    await fetchActivityLogs({ page: 0, search: '', action: 'all', entity: 'all' });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'create':
        return '#10b981';
      case 'update':
        return '#3b82f6';
      case 'delete':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const totalPages = Math.ceil(totalLogs / logsPerPage);

  if (!isOpen) return null;

  return (
    <div className="history-modal-overlay" onClick={onClose}>
      <div className="history-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="history-modal-header">
          <h2>↻ Activity History</h2>
          <button className="history-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="history-modal-body">
          <div className="history-filters">
            <input
              type="text"
              className="history-filter-input"
              placeholder="Search logs by description, user, or entity..."
              value={searchText}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            <select
              className="history-filter-select"
              value={actionFilter}
              onChange={(e) => handleActionChange(e.target.value)}
            >
              <option value="all">All actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
            </select>
            <select
              className="history-filter-select"
              value={entityFilter}
              onChange={(e) => handleEntityChange(e.target.value)}
            >
              <option value="all">All entities</option>
              <option value="customer">Customer</option>
              <option value="invoice">Invoice</option>
              <option value="quotation">Quotation</option>
              <option value="payment">Payment</option>
              <option value="staff">Staff</option>
            </select>
            <button type="button" className="history-filter-reset" onClick={resetFilters}>
              Reset
            </button>
          </div>

          {loading ? (
            <div className="history-loading">Loading activity logs...</div>
          ) : logs.length === 0 ? (
            <div className="history-empty">No activity logs found</div>
          ) : (
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="history-row">
                      <td className="history-timestamp">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="history-user">
                        <div className="user-info">
                          <div className="user-name">{log.user_name || 'Unknown'}</div>
                          <div className="user-email">{log.user_email || '—'}</div>
                        </div>
                      </td>
                      <td className="history-action">
                        <span
                          className="action-badge"
                          style={{ backgroundColor: getActionColor(log.action_type) }}
                        >
                          {log.action_type.toUpperCase()}
                        </span>
                      </td>
                      <td className="history-entity">
                        <span className="entity-badge">
                          {log.entity_type}
                        </span>
                      </td>
                      <td className="history-description">
                        {log.description}
                      </td>
                      <td className="history-actions-cell">
                        <button
                          type="button"
                          className="history-delete-btn"
                          title="Delete log"
                          onClick={() => deleteLog(log.id)}
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {logs.length > 0 && (
          <div className="history-modal-footer">
            <div className="history-pagination">
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="history-btn"
              >
                ← Previous
              </button>
              <span className="history-page-info">
                Page {currentPage + 1} of {totalPages} (Total: {totalLogs} logs)
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage === totalPages - 1}
                className="history-btn"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
