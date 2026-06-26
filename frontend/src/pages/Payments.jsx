import { useEffect, useState } from 'react';
import api from '../api';

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const methods = ['cash', 'bank_transfer', 'card', 'upi', 'other'];
const methodLabels = { cash: '💵 Cash', bank_transfer: '🏦 Bank Transfer', card: '💳 Card', upi: '📱 UPI', other: '🔄 Other' };

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ invoice_id: '', amount: '', payment_date: '', method: 'upi', notes: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const [payRes, invRes] = await Promise.all([
        api.get('/payments'),
        api.get('/invoices'),
      ]);
      setPayments(payRes.data);
      setInvoices(invRes.data.filter(i => i.status !== 'paid'));
    } catch { }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ invoice_id: '', amount: '', payment_date: new Date().toISOString().split('T')[0], method: 'upi', notes: '' });
    setError('');
    setShowModal(true);
  };

  const handleInvoiceChange = (id) => {
    const inv = invoices.find(i => String(i.id) === String(id));
    setForm(f => ({ ...f, invoice_id: id, amount: inv ? (inv.remaining_amount !== undefined ? inv.remaining_amount : inv.amount) : '' }));
  };

  const handleSave = async () => {
    if (!form.invoice_id || !form.amount || !form.payment_date) return setError('Invoice, amount and date are required');
    setSaving(true);
    try {
      await api.post('/payments', form);
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this payment? The invoice will be reverted to Sent status.')) return;
    try { await api.delete(`/payments/${id}`); load(); } catch { alert('Failed to delete'); }
  };

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);

  const filtered = payments.filter(p =>
    (p.invoice_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.customer_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="page-subtitle">Total collected: <strong style={{ color: '#10b981' }}>{fmt(totalPaid)}</strong></p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Record Payment</button>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: 20 }}>
        <input
          type="text" className="form-control"
          placeholder="🔍  Search by invoice # or customer..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 48 }}>💳</div>
            <p>{search ? 'No payments match your search' : 'No payments recorded yet'}</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Date</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id}>
                    <td style={{ color: 'var(--gray-400)', fontSize: 13 }}>{i + 1}</td>
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>#{p.invoice_number}</td>
                    <td>{p.customer_name || '—'}</td>
                    <td style={{ fontWeight: 700, color: '#10b981' }}>{fmt(p.amount)}</td>
                    <td>
                      <span style={{ fontSize: 13 }}>{methodLabels[p.method] || p.method}</span>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                      {p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--gray-500)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.notes || <span style={{ color: 'var(--gray-300)' }}>—</span>}
                    </td>
                    <td>
                      <button className="btn-icon" title="Delete" onClick={() => handleDelete(p.id)}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Record Payment</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              {invoices.length === 0 && (
                <div className="alert alert-error">No unpaid invoices available. Create and send an invoice first.</div>
              )}

              {error && <div className="alert alert-error">{error}</div>}

              <div className="form-group">
                <label className="form-label">Invoice *</label>
                <select className="form-control" value={form.invoice_id} onChange={e => handleInvoiceChange(e.target.value)}>
                  <option value="">Select invoice</option>
                  {invoices.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      #{inv.invoice_number} — {inv.customer_name} — ₹{Number(inv.amount).toLocaleString()}
                      {inv.remaining_amount !== undefined && Number(inv.remaining_amount) < Number(inv.amount) ? ` (Remaining: ₹${Number(inv.remaining_amount).toLocaleString()})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Amount (₹) *</label>
                  <input type="number" className="form-control" placeholder="0.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Date *</label>
                  <input type="date" className="form-control" value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-control" value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
                  {methods.map(m => <option key={m} value={m}>{methodLabels[m]}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-control" rows={3} placeholder="Transaction ID, reference, etc." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || invoices.length === 0}>
                {saving ? 'Saving...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
