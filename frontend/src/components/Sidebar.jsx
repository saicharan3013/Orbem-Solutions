import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '▦', exact: true, permission: 'dashboard' },
  { path: '/customers', label: 'Customers', icon: '⊙', permission: 'customers' },
  { path: '/quotations', label: 'Quotations', icon: '◇', permission: 'quotations' },
  { path: '/invoices', label: 'Invoices', icon: '▭', permission: 'invoices' },
  { path: '/payments', label: 'Payments', icon: '◯', permission: 'payments' },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout, isAdmin, permissions } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Filter nav items based on staff permissions
  const getVisibleItems = () => {
    if (isAdmin) return navItems; // Admin sees all items
    
    // Staff only sees items they have view permission for
    if (permissions) {
      return navItems.filter(item => {
        // Dashboard is always visible
        if (item.permission === 'dashboard') return true;
        
        // Check if staff has view permission for this section
        const perm = permissions[item.permission];
        return perm && (perm.can_view === true || perm.can_view === 1);
      });
    }
    
    // Default: show all items (fallback)
    return navItems;
  };

  const visibleItems = getVisibleItems();

  return (
    <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
      {/* Mobile Close Button */}
      <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
        ✕
      </button>
      {/* Logo */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="ORBEM SOLUTIONS" style={{ width: 50, height: 50, objectFit: 'contain', borderRadius: '50%', border: '2px solid #6366f1' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: 'white' }}>ORBEM SOLUTIONS</div>
            <div style={{ fontSize: 11, color: '#e0e7ff' }}>Customer Invoice and Payment Tracker</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#c7d2fe', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 8px 12px' }}>
          Menu
        </div>
        {visibleItems.map(({ path, label, icon, exact }) => (
          <NavLink
            key={path}
            to={path}
            end={exact}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '11px 12px',
              borderRadius: 10,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? 'white' : '#dbeafe',
              background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
              marginBottom: 4,
              transition: 'all 0.15s',
            })}
          >
            <span style={{ fontSize: 20, fontWeight: 'bold', color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>{icon}</span>
            {label}
          </NavLink>
        ))}
        {isAdmin && (
          <>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#c7d2fe', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 8px 12px', marginTop: 16 }}>
              Admin
            </div>
            <NavLink
              to="/admin/staff"
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 12px',
                borderRadius: 10,
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'white' : '#dbeafe',
                background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                marginBottom: 4,
                transition: 'all 0.15s',
              })}
            >
              <span style={{ fontSize: 20, fontWeight: 'bold', color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>⚙</span>
              Staff Management
            </NavLink>
          </>
        )}
      </nav>

      {/* User section */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ padding: '12px', borderRadius: 10, background: 'rgba(255,255,255,0.1)', marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{user?.name}</div>
          <div style={{ fontSize: 11, color: '#dbeafe', marginTop: 2 }}>
            {user?.email}
            {isAdmin && <span style={{ display: 'block', marginTop: '4px', backgroundColor: '#28a745', color: 'white', padding: '2px 6px', borderRadius: '3px', width: 'fit-content', fontSize: '10px', fontWeight: '600' }}>Admin</span>}
          </div>
        </div>
        <NavLink
          to="/profile"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '9px 12px',
            borderRadius: 6,
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: isActive ? 600 : 500,
            color: isActive ? 'white' : '#dbeafe',
            background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
            marginBottom: 8,
            transition: 'all 0.15s',
            width: '100%'
          })}
        >
          <span style={{ fontSize: 16, fontWeight: 'bold', color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>◐</span> My Profile
        </NavLink>
        <button style={{ 
          width: '100%', 
          justifyContent: 'center',
          padding: '9px 12px',
          borderRadius: 6,
          border: '1.5px solid rgba(255,255,255,0.3)',
          background: 'transparent',
          color: '#dbeafe',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.15s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8
        }} 
        onMouseEnter={(e) => {
          e.target.style.background = 'rgba(255,255,255,0.1)';
          e.target.style.borderColor = 'rgba(255,255,255,0.5)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'transparent';
          e.target.style.borderColor = 'rgba(255,255,255,0.3)';
        }}
        onClick={handleLogout}>
          <span style={{ fontSize: 16, fontWeight: 'bold', color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>⊙</span> Logout
        </button>
      </div>
    </aside>
  );
}
