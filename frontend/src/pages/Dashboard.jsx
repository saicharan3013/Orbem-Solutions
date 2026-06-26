import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import History from '../components/History';

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, invoicesRes] = await Promise.all([
          api.get('/invoices/stats'),
          api.get('/invoices?limit=5'),
        ]);
        setStats(statsRes.data);
        setRecentInvoices(invoicesRes.data.slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--gray-400)' }}>Loading dashboard...</div>;

  const statusColor = { paid: '#10b981', draft: '#94a3b8', overdue: '#ef4444' };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.name} 👋</p>
        </div>
        {isAdmin && (
          <div>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setIsHistoryOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <span style={{ fontSize: 16, fontWeight: 'bold' }}>↻</span> History
            </button>
          </div>
        )}
      </div>

      <History isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#eef2ff', fontWeight: 'bold', fontSize: 24, color: '#6366f1' }}>📋</div>
          <div className="stat-value">{stats?.total_invoices || 0}</div>
          <div className="stat-label">Total Invoices</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dbeafe', fontWeight: 'bold', fontSize: 24, color: '#3b82f6' }}>💵</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{fmt(stats?.total_amount)}</div>
          <div className="stat-label">Total Billed</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#d1fae5', fontWeight: 'bold', fontSize: 24, color: '#10b981' }}>✓</div>
          <div className="stat-value" style={{ fontSize: 20, color: '#10b981' }}>{fmt(stats?.paid_amount)}</div>
          <div className="stat-label">Paid</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fee2e2', fontWeight: 'bold', fontSize: 24, color: '#ef4444' }}>🔔</div>
          <div className="stat-value" style={{ fontSize: 20, color: '#ef4444' }}>{fmt(stats?.overdue_amount)}</div>
          <div className="stat-label">Overdue</div>
        </div>
      </div>

      {/* Charts + Recent */}
      <div className="dashboard-grid">
        {/* Chart */}
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 20, fontSize: 16, color: 'var(--gray-800)' }}>Revenue Overview (6 months)</h3>
          {stats?.monthly?.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={v => '₹' + (v/1000).toFixed(0) + 'k'} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend />
                <Bar dataKey="total" name="Billed" fill="#c7d2fe" radius={[4,4,0,0]} />
                <Bar dataKey="paid" name="Paid" fill="#6366f1" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><p>No data yet. Create your first invoice!</p></div>
          )}
        </div>

        {/* Recent Invoices */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--gray-800)' }}>Recent Invoices</h3>
            <Link to="/invoices" style={{ fontSize: 13, color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>View all →</Link>
          </div>
          {recentInvoices.length === 0 ? (
            <div className="empty-state"><p>No invoices yet</p></div>
          ) : (
            <div>
              {recentInvoices.map(inv => (
                <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--gray-100)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-800)' }}>#{inv.invoice_number}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>{inv.customer_name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{fmt(inv.amount)}</div>
                    <span className={`badge badge-${inv.status}`} style={{ marginTop: 4 }}>{inv.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
