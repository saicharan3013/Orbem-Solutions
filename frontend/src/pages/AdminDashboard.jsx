import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
    }
  }, [isAdmin, navigate]);

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1>Admin Dashboard</h1>
        <p style={{ color: '#666', marginTop: '5px' }}>Welcome, {user?.name}! Manage your staff and business operations.</p>
      </div>

      <div style={{ marginTop: '40px' }}>
        <h3 style={{ marginBottom: '20px' }}>Actions</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => navigate('/admin/staff')}
            style={{
              padding: '12px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Manage Staff
          </button>
        </div>
      </div>
    </div>
  );
}
