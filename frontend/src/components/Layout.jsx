import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Auto-close sidebar on route changes (on mobile drawer)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="main-content">
        <header className="mobile-header">
          <button className="menu-toggle" onClick={() => setSidebarOpen(true)} aria-label="Toggle Menu">
            ☰
          </button>
          <div className="mobile-logo">
            <img src="/logo.png" alt="Logo" className="mobile-logo-img" />
            <span className="mobile-logo-text">ORBEM</span>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
