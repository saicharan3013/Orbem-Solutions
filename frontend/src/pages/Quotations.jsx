import { useEffect, useState } from 'react';
import api from '../api';
import Modal from '../components/Modal';
import { AIRPORTS } from '../data/airports';

const emptyForm = { 
  customer_id: '', 
  quotation_number: '', 
  items: [{ description: '', weight: '', quantity: 1, unit_price: '' }],
  tax_rate: 0,
  discount: 0,
  validity_days: 30,
  origin_airport: '',
  destination_airport: '',
  notes: '',
  status: 'draft'
};
const statuses = ['all', 'draft', 'accepted', 'rejected'];
const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const getSuggestions = (val) => {
  if (!val) {
    return AIRPORTS.slice(0, 20);
  }
  const query = val.toLowerCase().trim();
  return AIRPORTS.filter(ap => {
    if (ap.toLowerCase().startsWith(query)) return true;
    const iata = ap.slice(0, 3).toLowerCase();
    if (iata.startsWith(query)) return true;
    const words = ap.toLowerCase().split(/[\s\-()]+/);
    return words.some(word => word.startsWith(query));
  }).slice(0, 50);
};

export default function Quotations() {
  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);
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
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [showDestinationDropdown, setShowDestinationDropdown] = useState(false);

  const load = async () => {
    try {
      const [quotRes, cusRes] = await Promise.all([
        api.get('/quotations').catch(() => ({ data: [] })),
        api.get('/customers')
      ]);
      setQuotations(quotRes.data);
      setCustomers(cusRes.data);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load data' });
      setTimeout(() => setMessage(null), 3000);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const calculateTotals = (items, taxRate, discount) => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * (item.unit_price === '' ? 0 : item.unit_price)), 0);
    const tax = (subtotal * taxRate) / 100;
    const total = subtotal + tax - discount;
    return { subtotal, tax, total };
  };

  const openCreate = () => {
    setEditItem(null);
    const num = 'QT-' + Date.now().toString().slice(-6);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
    setShowOriginDropdown(false);
    setShowDestinationDropdown(false);
    setForm({ ...emptyForm, quotation_number: num });
    setError('');
    setShowModal(true);
  };

  const openEdit = (quotation) => {
    setEditItem(quotation);
    setForm({
      customer_id: quotation.customer_id,
      quotation_number: quotation.quotation_number,
      items: (quotation.items || []).map(item => ({
        ...item,
        weight: item.weight || '',
        unit_price: item.unit_price || ''
      })),
      tax_rate: quotation.tax_rate || 0,
      discount: quotation.discount || 0,
      validity_days: quotation.validity_days || 30,
      origin_airport: quotation.origin_airport || '',
      destination_airport: quotation.destination_airport || '',
      notes: quotation.notes || '',
      status: quotation.status || 'draft'
    });
    setCustomerSearch('');
    setShowCustomerDropdown(false);
    setShowOriginDropdown(false);
    setShowDestinationDropdown(false);
    setError('');
    setShowModal(true);
  };

  const handleAddItem = () => {
    setForm({
      ...form,
      items: [...form.items, { description: '', weight: '', quantity: 1, unit_price: 0 }]
    });
  };

  const handleRemoveItem = (index) => {
    if (form.items.length > 1) {
      setForm({
        ...form,
        items: form.items.filter((_, i) => i !== index)
      });
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...form.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setForm({ ...form, items: newItems });
  };

  const handleSave = async () => {
    if (!form.customer_id || !form.quotation_number) return setError('Customer and quotation number are required');
    if (!form.origin_airport || !form.destination_airport) return setError('Origin airport and destination airport are required');
    if (form.items.some(item => !item.description || !item.quantity || item.unit_price === '' || item.unit_price === 0)) {
      return setError('All line items must have description, quantity and unit price');
    }
    const itemsToSave = form.items.map(item => ({
      ...item,
      unit_price: item.unit_price === '' ? 0 : item.unit_price
    }));
    
    setSaving(true);
    try {
      const formToSave = { ...form, items: itemsToSave };
      if (editItem) {
        await api.put(`/quotations/${editItem.id}`, formToSave);
      } else {
        await api.post('/quotations', formToSave);
      }
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    setDeleteConfirm(id);
  };

  const handleConvertToInvoice = async (quotation) => {
    const normalizedStatus = (quotation.status || '').toLowerCase();
    if (normalizedStatus !== 'accepted') {
      setMessage({ type: 'error', text: 'Only accepted quotations can be converted to invoices' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    try {
      setSaving(true);
      await api.post(`/quotations/${quotation.id}/convert-to-invoice`);
      setMessage({ type: 'success', text: 'Invoice created successfully from quotation' });
      setTimeout(() => setMessage(null), 3000);
      load();
    } catch (err) {
      const serverMessage = err.response?.data?.message || 'Failed to convert quotation to invoice';
      setMessage({ type: 'error', text: serverMessage });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/quotations/${deleteConfirm}`);
      setDeleteConfirm(null);
      setMessage({ type: 'success', text: 'Quotation deleted successfully' });
      setTimeout(() => setMessage(null), 3000);
      load();
    } catch {
      setDeleteConfirm(null);
      setMessage({ type: 'error', text: 'Failed to delete quotation' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const selectedCustomer = customers.find(c => c.id === form.customer_id);

  const filtered = quotations.filter(q => {
    const matchStatus = filter === 'all' || q.status === filter;
    const matchSearch = q.quotation_number.toLowerCase().includes(search.toLowerCase()) ||
      (q.customer_name || '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts = statuses.reduce((acc, s) => {
    acc[s] = s === 'all' ? quotations.length : quotations.filter(q => q.status === s).length;
    return acc;
  }, {});

  const { subtotal, tax, total } = calculateTotals(form.items, form.tax_rate, form.discount);

  const statusColors = {
    draft: '#94a3b8',
    accepted: '#10b981',
    rejected: '#ef4444'
  };

  const originSuggestions = getSuggestions(form.origin_airport);
  const destinationSuggestions = getSuggestions(form.destination_airport);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Quotations</h1>
          <p className="page-subtitle">{quotations.length} total quotations</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Quotation</button>
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
            type="text" className="form-control" placeholder="🔍 Search quotations..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          No quotations found
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Quotation #</th>
                  <th>Customer</th>
                  <th>Email</th>
                  <th style={{ textAlign: 'right' }}>Estimated Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((q) => (
                  <tr key={q.id}>
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{q.quotation_number}</td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{q.customer_name}</span>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>
                        {q.origin_airport || '—'} → {q.destination_airport || '—'}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{q.customer_email}</td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>{fmt(q.estimated_amount)}</td>
                    <td>
                      <span className="badge" style={{ backgroundColor: statusColors[q.status], color: 'white', textTransform: 'capitalize' }}>
                        {q.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {q.status === 'accepted' && (
                          <button className="btn-icon" onClick={() => handleConvertToInvoice(q)} title="Convert to Invoice">💾</button>
                        )}
                        <button className="btn-icon" onClick={() => openEdit(q)} title="Edit">✏️</button>
                        <button className="btn-icon" onClick={() => handleDelete(q.id)} title="Delete">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <Modal title="Confirm Delete" message={`Are you sure you want to delete this quotation?`}>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={confirmDelete}>Delete</button>
          </div>
        </Modal>
      )}

      {/* Modal */}
      <Modal 
        isOpen={showModal} 
        title={editItem ? 'Edit Quotation' : 'Create Quotation'} 
        onCancel={() => setShowModal(false)}
        onConfirm={handleSave}
        confirmText={saving ? 'Saving...' : (editItem ? 'Update' : 'Create')}
        size="lg"
      >
        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

            {/* Quotation Number */}
            <div className="form-group">
              <label>Quotation Number</label>
              <input
                type="text"
                value={form.quotation_number}
                onChange={e => setForm({ ...form, quotation_number: e.target.value })}
                disabled
                style={{ opacity: 0.6 }}
              />
            </div>

            {/* Customer Dropdown */}
            <div className="form-group">
              <label>Select Customer *</label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--gray-200)',
                    borderRadius: 6,
                    cursor: 'pointer',
                    backgroundColor: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                >
                  <span>{selectedCustomer ? selectedCustomer.name : 'Choose customer...'}</span>
                  <span>▼</span>
                </div>
                {showCustomerDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid var(--gray-200)',
                    borderTop: 'none',
                    borderRadius: '0 0 6px 6px',
                    maxHeight: 200,
                    overflowY: 'auto',
                    zIndex: 1000,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}>
                    {customers.length === 0 ? (
                      <div style={{ padding: '12px', color: 'var(--gray-500)', textAlign: 'center' }}>
                        No customers available
                      </div>
                    ) : (
                      customers.map(c => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setForm({ ...form, customer_id: c.id });
                            setShowCustomerDropdown(false);
                          }}
                          style={{
                            padding: '12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--gray-100)',
                            backgroundColor: form.customer_id === c.id ? '#f0f9ff' : 'white',
                            ':hover': { backgroundColor: '#f9fafb' }
                          }}
                        >
                          <div style={{ fontWeight: 500 }}>{c.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{c.email}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Airport Fields */}
            <div className="form-row" style={{ marginBottom: 20 }}>
              <div className="form-group">
                <label>Origin Airport *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={form.origin_airport}
                    onChange={e => {
                      setForm({ ...form, origin_airport: e.target.value });
                      setShowOriginDropdown(true);
                    }}
                    onFocus={() => setShowOriginDropdown(true)}
                    onBlur={() => setTimeout(() => setShowOriginDropdown(false), 250)}
                    className="form-control"
                    placeholder="e.g. BOM"
                  />
                  {showOriginDropdown && originSuggestions.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: 'white',
                      border: '1px solid var(--gray-200)',
                      borderRadius: '0 0 6px 6px',
                      maxHeight: 200,
                      overflowY: 'auto',
                      zIndex: 1000,
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                      {originSuggestions.map((airport, index) => (
                        <div
                          key={index}
                          onClick={() => {
                            setForm({ ...form, origin_airport: airport });
                            setShowOriginDropdown(false);
                          }}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--gray-100)',
                            fontSize: '13px',
                            color: 'var(--gray-700)',
                            backgroundColor: form.origin_airport === airport ? '#f0f9ff' : 'white',
                            textAlign: 'left'
                          }}
                          className="airport-option"
                        >
                          {airport}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label>Destination Airport *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={form.destination_airport}
                    onChange={e => {
                      setForm({ ...form, destination_airport: e.target.value });
                      setShowDestinationDropdown(true);
                    }}
                    onFocus={() => setShowDestinationDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDestinationDropdown(false), 250)}
                    className="form-control"
                    placeholder="e.g. DXB"
                  />
                  {showDestinationDropdown && destinationSuggestions.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: 'white',
                      border: '1px solid var(--gray-200)',
                      borderRadius: '0 0 6px 6px',
                      maxHeight: 200,
                      overflowY: 'auto',
                      zIndex: 1000,
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                      {destinationSuggestions.map((airport, index) => (
                        <div
                          key={index}
                          onClick={() => {
                            setForm({ ...form, destination_airport: airport });
                            setShowDestinationDropdown(false);
                          }}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--gray-100)',
                            fontSize: '13px',
                            color: 'var(--gray-700)',
                            backgroundColor: form.destination_airport === airport ? '#f0f9ff' : 'white',
                            textAlign: 'left'
                          }}
                          className="airport-option"
                        >
                          {airport}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <label style={{ fontWeight: 600 }}>Line Items *</label>
                <button onClick={handleAddItem} style={{
                  background: 'none', border: '1px solid #3b82f6', color: '#3b82f6',
                  padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 500
                }}>+ Add Item</button>
              </div>

              {form.items.map((item, idx) => (
                <div key={idx} style={{ marginBottom: 12, padding: 12, border: '1px solid var(--gray-200)', borderRadius: 6 }}>
                  <div className="line-item-row">
                    <div>
                      <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Description</label>
                      <input
                        type="text"
                        placeholder="Item description"
                        value={item.description}
                        onChange={e => handleItemChange(idx, 'description', e.target.value)}
                        className="form-control"
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Weight (kg)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={item.weight === '' ? '' : item.weight}
                        onChange={e => handleItemChange(idx, 'weight', e.target.value === '' ? '' : Number(e.target.value))}
                        className="form-control"
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
                        className="form-control"
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Unit Price</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={item.unit_price === '' ? '' : item.unit_price}
                        onChange={e => handleItemChange(idx, 'unit_price', e.target.value === '' ? '' : Number(e.target.value))}
                        className="form-control"
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Amount</label>
                      <div style={{ 
                        padding: '10px 14px', 
                        backgroundColor: '#f8fafc', 
                        border: '1.5px solid var(--gray-200)', 
                        borderRadius: '8px', 
                        fontWeight: 500, 
                        height: '43px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        boxSizing: 'border-box' 
                      }}>
                        {fmt(item.quantity * (item.unit_price === '' ? 0 : item.unit_price))}
                      </div>
                    </div>
                    <div>
                      <button onClick={() => handleRemoveItem(idx)} style={{
                        background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer',
                        fontSize: 12, fontWeight: 500, padding: '8px 4px', width: '100%',
                        opacity: form.items.length === 1 ? 0.5 : 1,
                        pointerEvents: form.items.length === 1 ? 'none' : 'auto'
                      }}>✕</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Calculation Section */}
            <div style={{ 
              backgroundColor: '#f9fafb', 
              padding: 12, 
              borderRadius: 6, 
              marginBottom: 20,
              border: '1px solid var(--gray-200)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Subtotal:</span>
                <span style={{ fontWeight: 500 }}>{fmt(subtotal)}</span>
              </div>
              <div className="form-row" style={{ marginBottom: 8 }}>
                <div>
                  <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Tax Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.tax_rate}
                    onChange={e => setForm({ ...form, tax_rate: Number(e.target.value) })}
                    className="form-control"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Discount ({fmt(form.discount)})</label>
                  <input
                    type="number"
                    min="0"
                    value={form.discount}
                    onChange={e => setForm({ ...form, discount: Number(e.target.value) })}
                    className="form-control"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Tax:</span>
                <span style={{ fontWeight: 500 }}>{fmt(tax)}</span>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                paddingTop: 8, 
                borderTop: '2px solid var(--gray-300)',
                fontWeight: 600,
                fontSize: 16
              }}>
                <span>Estimated Amount:</span>
                <span style={{ color: '#3b82f6' }}>{fmt(total)}</span>
              </div>
            </div>

            {/* Additional Fields */}
            <div className="form-row" style={{ marginBottom: 20 }}>
              <div className="form-group">
                <label>Validity Days</label>
                <input
                  type="number"
                  min="1"
                  value={form.validity_days}
                  onChange={e => setForm({ ...form, validity_days: Number(e.target.value) })}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                  className="form-control"
                >
                  <option value="draft">Draft</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className="form-control"
                rows="3"
                placeholder="Additional notes..."
              />
            </div>

        </Modal>
    </div>
  );
}
