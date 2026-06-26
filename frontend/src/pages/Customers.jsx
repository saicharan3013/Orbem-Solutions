import { useEffect, useState } from 'react';
import api from '../api';
import Modal from '../components/Modal';

const emptyForm = { name: '', email: '', phone: '', company: '', address: '', gst_number: '', city: '', county: '' };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [message, setMessage] = useState(null);

  const load = async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditItem(null); setForm(emptyForm); setError(''); setShowModal(true); };
  const openEdit = (c) => { setEditItem(c); setForm({ name: c.name, email: c.email || '', phone: c.phone || '', company: c.company || '', address: c.address || '', gst_number: c.gst_number || '', city: c.city || '', county: c.county || '' }); setError(''); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name.trim()) return setError('Name is required');
    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/customers/${editItem.id}`, form);
      } else {
        await api.post('/customers', form);
      }
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/customers/${deleteConfirm}`);
      setDeleteConfirm(null);
      setMessage({ type: 'success', text: 'Customer deleted successfully' });
      setTimeout(() => setMessage(null), 3000);
      load();
    } catch {
      setDeleteConfirm(null);
      setMessage({ type: 'error', text: 'Failed to delete customer' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.company || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.gst_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.city || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.county || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">{customers.length} total customers</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Customer</button>
      </div>

      {/* Messages */}
      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: 20 }}>
          {message.text}
        </div>
      )}

      {/* Search */}
      <div className="card" style={{ marginBottom: 20 }}>
        <input
          type="text"
          className="form-control"
          placeholder="🔍  Search by name, email or company..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 48 }}>👥</div>
            <p>{search ? 'No customers match your search' : 'No customers yet. Add your first one!'}</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Company</th>
                  <th>GST</th>
                  <th>City</th>
                  <th>County</th>
                  <th>Added</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id}>
                    <td style={{ color: 'var(--gray-400)', fontSize: 13 }}>{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: 'var(--primary-light)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 14, color: 'var(--primary)',
                          flexShrink: 0,
                        }}>
                          {c.name[0].toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                      </div>
                    </td>
                    <td>{c.email || <span style={{ color: 'var(--gray-300)' }}>—</span>}</td>
                    <td>{c.phone || <span style={{ color: 'var(--gray-300)' }}>—</span>}</td>
                    <td>{c.company || <span style={{ color: 'var(--gray-300)' }}>—</span>}</td>
                    <td>{c.gst_number || <span style={{ color: 'var(--gray-300)' }}>—</span>}</td>
                    <td>{c.city || <span style={{ color: 'var(--gray-300)' }}>—</span>}</td>
                    <td>{c.county || <span style={{ color: 'var(--gray-300)' }}>—</span>}</td>
                    <td style={{ fontSize: 13, color: 'var(--gray-400)' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-icon" title="Edit" onClick={() => openEdit(c)}>✏️</button>
                        <button className="btn-icon" title="Delete" onClick={() => handleDelete(c.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        title="Delete Customer?"
        message="This customer and all their invoices will be permanently deleted. This action cannot be undone."
        type="danger"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
      {/* Modal */}
      <Modal isOpen={showModal} title={editItem ? 'Edit Customer' : 'Add Customer'} onCancel={() => setShowModal(false)} onConfirm={handleSave} confirmText={editItem ? 'Save Changes' : 'Add Customer'}>
        {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

        <div className="form-group">
          <label>Name *</label>
          <input type="text" className="form-control" placeholder="Full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="form-row" style={{ marginBottom: 12 }}>
          <div>
            <label>Email</label>
            <input type="email" className="form-control" placeholder="email@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label>Phone</label>
            <input type="text" className="form-control" placeholder="+91 9000000000" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>

        <div className="form-group">
          <label>Company</label>
          <input type="text" className="form-control" placeholder="Company name" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
        </div>

        <div className="form-row" style={{ marginBottom: 12 }}>
          <div>
            <label>GST Number</label>
            <input type="text" className="form-control" placeholder="GST number" value={form.gst_number} onChange={e => setForm({ ...form, gst_number: e.target.value })} />
          </div>
          <div>
            <label>City</label>
            <input type="text" className="form-control" placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
          </div>
        </div>

        <div className="form-group">
          <label>County</label>
          <input type="text" className="form-control" placeholder="County" value={form.county} onChange={e => setForm({ ...form, county: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Address</label>
          <textarea className="form-control" rows={3} placeholder="Full address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
