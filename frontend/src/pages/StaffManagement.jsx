import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';

const SECTIONS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'customers', label: 'Customers' },
  { id: 'quotations', label: 'Quotations' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'payments', label: 'Payments' }
];

export default function StaffManagement() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    permissions: []
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchStaff();
  }, [isAdmin, navigate]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await api.get('/staff');
      setStaff(res.data);
    } catch (err) {
      console.error('Failed to fetch staff:', err);
      setError('Failed to load staff members');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = () => {
    setEditingId(null);
    setForm({ name: '', email: '', password: '', permissions: [] });
    setError('');
    setShowModal(true);
  };

  const handleEditClick = (staffMember) => {
    setEditingId(staffMember.id);
    setForm({
      name: staffMember.name,
      email: staffMember.email,
      password: '',
      permissions: staffMember.permissions || []
    });
    setError('');
    setShowModal(true);
  };

  const handlePermissionChange = (section, permission, value) => {
    const updatedPerms = form.permissions.map(p => 
      p.section === section ? { ...p, [permission]: value } : p
    );
    
    if (!updatedPerms.find(p => p.section === section)) {
      updatedPerms.push({ section, can_view: false, can_edit: false, can_delete: false, [permission]: value });
    }
    
    setForm({ ...form, permissions: updatedPerms });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name || !form.email) {
      setError('Name and email are required');
      return;
    }

    if (!editingId && !form.password) {
      setError('Password is required for new staff');
      return;
    }

    try {
      const payload = {
        name: form.name,
        email: form.email,
        permissions: form.permissions
      };

      if (form.password) {
        payload.password = form.password;
      }

      if (editingId) {
        await api.put(`/staff/${editingId}`, payload);
      } else {
        await api.post('/staff', payload);
      }

      setShowModal(false);
      fetchStaff();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save staff member');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) {
      return;
    }

    try {
      await api.delete(`/staff/${id}`);
      fetchStaff();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete staff member');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ddd',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            color: '#333',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#e0e0e0'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#f0f0f0'}
        >
          ← Back to Dashboard
        </button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1>Staff Management</h1>
          <p style={{ color: '#666', marginTop: '5px' }}>Add and manage your staff members and their permissions</p>
        </div>
        <button
          onClick={handleAddClick}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          + Add Staff
        </button>
      </div>

      {error && <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '12px', borderRadius: '6px', marginBottom: '20px' }}>{error}</div>}

      {staff.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="🔍 Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 15px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
      ) : staff.length === 0 ? (
        <div style={{
          backgroundColor: '#f9f9f9',
          padding: '40px',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#666'
        }}>
          No staff members yet. Click "Add Staff" to create one.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: 'white',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '15px', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Email</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Permissions</th>
                <th style={{ padding: '15px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff
                .filter(s => 
                  s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  s.email.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '15px' }}>{s.name}</td>
                  <td style={{ padding: '15px', color: '#666' }}>{s.email}</td>
                  <td style={{ padding: '15px' }}>
                    {s.permissions && s.permissions.filter(p => p.can_view || p.can_edit || p.can_delete).length > 0 ? (
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {s.permissions
                          .filter(p => p.can_view || p.can_edit || p.can_delete)
                          .map(p => (
                            <span key={p.section} style={{
                              backgroundColor: '#e7f3ff',
                              color: '#0066cc',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}>
                              {p.section}
                            </span>
                          ))}
                      </div>
                    ) : (
                      <span style={{ color: '#999' }}>No permissions</span>
                    )}
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleEditClick(s)}
                      style={{
                        padding: '6px 12px',
                        marginRight: '8px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Edit Staff Member' : 'Add New Staff Member'}>
        <form onSubmit={handleSubmit}>
          {error && <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>{error}</div>}

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              placeholder="Staff name"
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              placeholder="staff@example.com"
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              {editingId ? 'New Password (leave blank to keep current)' : 'Password *'}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              placeholder="Enter password"
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: '500' }}>Permissions</label>
            <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '4px' }}>
              {SECTIONS.map(section => {
                const perm = form.permissions.find(p => p.section === section.id) || {
                  section: section.id,
                  can_view: false,
                  can_edit: false,
                  can_delete: false
                };
                return (
                  <div key={section.id} style={{ marginBottom: '15px' }}>
                    <div style={{ fontWeight: '500', marginBottom: '8px' }}>{section.label}</div>
                    <div style={{ display: 'flex', gap: '15px', marginLeft: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <input
                          type="checkbox"
                          checked={perm.can_view}
                          onChange={e => handlePermissionChange(section.id, 'can_view', e.target.checked)}
                        />
                        View
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <input
                          type="checkbox"
                          checked={perm.can_edit}
                          onChange={e => handlePermissionChange(section.id, 'can_edit', e.target.checked)}
                        />
                        Edit
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <input
                          type="checkbox"
                          checked={perm.can_delete}
                          onChange={e => handlePermissionChange(section.id, 'can_delete', e.target.checked)}
                        />
                        Delete
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button
              type="submit"
              style={{
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              {editingId ? 'Update Staff' : 'Add Staff'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
