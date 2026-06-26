import { useEffect, useState } from 'react';
import api from '../api';
import Modal from '../components/Modal';

const emptyForm = { quotation_id: '', invoice_number: '', amount: '', status: 'draft', paid_amount: '', due_date: '', issue_date: '', notes: '' };
const statuses = ['all', 'draft', 'paid', 'partial_paid'];
const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [message, setMessage] = useState(null);
  const [quotationSearch, setQuotationSearch] = useState('');
  const [showQuotationDropdown, setShowQuotationDropdown] = useState(false);

  const load = async () => {
    try {
      const [invRes, quotRes] = await Promise.all([api.get('/invoices'), api.get('/quotations').catch(() => ({ data: [] }))]);
      setInvoices(invRes.data);
      setQuotations(quotRes.data);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditItem(null);
    const num = 'INV-' + Date.now().toString().slice(-6);
    setQuotationSearch('');
    setShowQuotationDropdown(false);
    setForm({ ...emptyForm, invoice_number: num, issue_date: new Date().toISOString().split('T')[0], status: 'draft', paid_amount: '' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (inv) => {
    setEditItem(inv);
    setForm({
      quotation_id: inv.quotation_id || '',
      invoice_number: inv.invoice_number,
      amount: inv.amount,
      status: inv.status,
      paid_amount: inv.paid_amount || '',
      due_date: inv.due_date ? inv.due_date.split('T')[0] : '',
      issue_date: inv.issue_date ? inv.issue_date.split('T')[0] : '',
      notes: inv.notes || '',
    });
    setQuotationSearch('');
    setShowQuotationDropdown(false);
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.quotation_id || !form.invoice_number) return setError('Quotation and invoice number are required');
    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/invoices/${editItem.id}`, form);
      } else {
        await api.post('/invoices', form);
      }
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleSend = async (id) => {
    try {
      const res = await api.post(`/invoices/${id}/send`);
      setMessage({ type: 'success', text: res.data?.message || 'Invoice sent successfully!' });
      setTimeout(() => setMessage(null), 3000);
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to send invoice' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDelete = async (id) => {
    setDeleteConfirm(id);
  };

  const downloadPDF = async (id, invoiceNumber) => {
    try {
      const token = localStorage.getItem('orbem_token');
      const response = await fetch(`https://orbem-solutions-backend.onrender.com/${id}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to download PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice_${invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to download PDF' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/invoices/${deleteConfirm}`);
      setDeleteConfirm(null);
      setMessage({ type: 'success', text: 'Invoice deleted successfully' });
      setTimeout(() => setMessage(null), 3000);
      load();
    } catch {
      setDeleteConfirm(null);
      setMessage({ type: 'error', text: 'Failed to delete invoice' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const filtered = invoices.filter(inv => {
    const matchStatus = filter === 'all' || inv.status === filter;
    const matchSearch = inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (inv.customer_name || '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts = statuses.reduce((acc, s) => {
    acc[s] = s === 'all' ? invoices.length : invoices.filter(i => i.status === s).length;
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">{invoices.length} total invoices</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Invoice</button>
      </div>

      {/* Messages */}
      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: 20 }}>
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="filters">
            {statuses.map(s => (
              <button key={s} className={`filter-btn ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s]})
              </button>
            ))}
          </div>
          <input
            type="text" className="form-control" placeholder="🔍  Search invoices..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 260, marginLeft: 'auto' }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 48 }}>📄</div>
            <p>No invoices found</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Total Amount</th>
                  <th>Paid Amount</th>
                  <th>Remaining</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>#{inv.invoice_number}</td>
                    <td>{inv.customer_name || <span style={{ color: 'var(--gray-300)' }}>—</span>}</td>
                    <td style={{ fontWeight: 600 }}>{fmt(inv.amount)}</td>
                    <td style={{ fontWeight: 600, color: '#10b981' }}>{fmt(inv.paid_amount || 0)}</td>
                    <td style={{ fontWeight: 600, color: inv.remaining_amount > 0 ? '#f59e0b' : '#10b981' }}>
                      {fmt(inv.remaining_amount || 0)}
                      {inv.is_overdue ? <div style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>⚠ Overdue</div> : null}
                    </td>
                    <td><span className={`badge badge-${inv.status}`}>{inv.status}</span></td>
                    <td style={{ fontSize: 13, color: inv.is_overdue ? 'var(--danger)' : 'var(--gray-500)' }}>
                      {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-icon" title="Download PDF" onClick={() => downloadPDF(inv.id, inv.invoice_number)}>📥</button>
                        <button className="btn-icon" title="Send Invoice" onClick={() => handleSend(inv.id)}>📧</button>
                        <button className="btn-icon" title="Edit" onClick={() => openEdit(inv)}>✏️</button>
                        <button className="btn-icon" title="Delete" onClick={() => handleDelete(inv.id)}>🗑️</button>
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
        title="Delete Invoice?"
        message="This invoice will be permanently deleted. This action cannot be undone."
        type="danger"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{editItem ? 'Edit Invoice' : 'Create Invoice from Quotation'}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              {error && <div className="alert alert-error">{error}</div>}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Quotation *</label>
                  <div style={{ position: 'relative' }}>
                    <div 
                      className="form-control"
                      onClick={() => setShowQuotationDropdown(!showQuotationDropdown)}
                      style={{ cursor: 'pointer', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px' }}
                    >
                      <span>{form.quotation_id ? (quotations.find(q => q.id == form.quotation_id)?.quotation_number + ' - ' + quotations.find(q => q.id == form.quotation_id)?.customer_name) : 'Select quotation'}</span>
                      <span>▼</span>
                    </div>
                    {showQuotationDropdown && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, background: 'white',
                        border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 8px 8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', zIndex: 100, maxHeight: 300, overflowY: 'auto'
                      }}>
                        <input
                          type="text"
                          placeholder="🔍 Search quotations..."
                          value={quotationSearch}
                          onChange={e => setQuotationSearch(e.target.value)}
                          style={{
                            width: '100%', padding: '10px 12px', border: 'none', borderBottom: '1px solid #e2e8f0',
                            boxSizing: 'border-box', fontSize: 14
                          }}
                          autoFocus
                        />
                        {quotations
                          .filter(q => q.quotation_number.toLowerCase().includes(quotationSearch.toLowerCase()) || 
                                      (q.customer_name || '').toLowerCase().includes(quotationSearch.toLowerCase()))
                          .filter(q => q.status === 'accepted')
                          .sort((a, b) => b.created_at?.localeCompare(a.created_at))
                          .map(q => (
                            <div
                              key={q.id}
                              onClick={() => {
                                setForm({ ...form, quotation_id: q.id, amount: q.estimated_amount, notes: q.notes });
                                setShowQuotationDropdown(false);
                                setQuotationSearch('');
                              }}
                              style={{
                                padding: '10px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                                background: form.quotation_id == q.id ? '#f0f4ff' : 'white',
                                color: form.quotation_id == q.id ? '#6366f1' : '#0f172a',
                                fontWeight: form.quotation_id == q.id ? 600 : 400
                              }}
                              onMouseOver={e => e.target.style.background = '#f8fafc'}
                              onMouseOut={e => e.target.style.background = form.quotation_id == q.id ? '#f0f4ff' : 'white'}
                            >
                              <div style={{ fontWeight: 600 }}>{q.quotation_number}</div>
                              <div style={{ fontSize: 12, color: '#64748b' }}>
                                {q.customer_name} - {fmt(q.estimated_amount)}
                              </div>
                            </div>
                          ))}
                        {quotations
                          .filter(q => q.quotation_number.toLowerCase().includes(quotationSearch.toLowerCase()) || 
                                      (q.customer_name || '').toLowerCase().includes(quotationSearch.toLowerCase()))
                          .filter(q => q.status === 'accepted')
                          .length === 0 && (
                          <div style={{ padding: '20px 12px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                            No accepted quotations found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Invoice Number *</label>
                  <input type="text" className="form-control" value={form.invoice_number} onChange={e => setForm({ ...form, invoice_number: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input type="number" className="form-control" placeholder="Auto-filled from quotation" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} readOnly style={{ background: '#f1f5f9', cursor: 'not-allowed' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-control" value={form.status} onChange={e => {
                    const newStatus = e.target.value;
                    const newForm = { ...form, status: newStatus };
                    // Auto-populate paid_amount when status is 'paid'
                    if (newStatus === 'paid') {
                      newForm.paid_amount = form.amount;
                    }
                    setForm(newForm);
                  }}>
                    <option value="draft">Draft</option>
                    <option value="partial_paid">Partial Paid</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>
              {(form.status === 'paid' || form.status === 'partial_paid') && (
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Paid Amount (₹) {form.status === 'paid' && '*'}</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="Enter paid amount" 
                      value={form.paid_amount} 
                      onChange={e => {
                        const paidAmt = parseFloat(e.target.value) || 0;
                        const totalAmt = parseFloat(form.amount) || 0;
                        let newStatus = form.status;
                        
                        // Auto-determine status based on paid amount
                        if (paidAmt === 0) {
                          newStatus = 'draft';
                        } else if (paidAmt >= totalAmt) {
                          newStatus = 'paid';
                        } else {
                          newStatus = 'partial_paid';
                        }
                        
                        setForm({ ...form, paid_amount: e.target.value, status: newStatus });
                      }}
                      max={form.amount}
                      min="0"
                    />
                  </div>
                </div>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Issue Date</label>
                  <input type="date" className="form-control" value={form.issue_date} onChange={e => setForm({ ...form, issue_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input type="date" className="form-control" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-control" rows={3} placeholder="Additional notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editItem ? 'Save Changes' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
