import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import '../styles/profile.css';

export default function StaffProfile() {
  const { user, logout, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [editName, setEditName] = useState(false);
  const [newName, setNewName] = useState('');
  const [editProfile, setEditProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ phone: '', company: '', gst_number: '', address: '', website: '' });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchProfile, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      setProfile(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) {
      setError('Name cannot be empty');
      return;
    }
    try {
      await api.put('/auth/update-profile', { name: newName });
      setMessage('Name updated successfully');
      setEditName(false);
      fetchProfile();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating name');
    }
  };

  const openEditProfile = () => {
    setProfileForm({
      phone: profile?.phone || '',
      company: profile?.company || '',
      gst_number: profile?.gst_number || '',
      address: profile?.address || '',
      website: profile?.website || ''
    });
    setEditProfile(true);
    setError('');
  };

  const handleUpdateProfile = async () => {
    try {
      await api.put('/auth/update-profile', profileForm);
      setMessage('Profile updated successfully');
      setEditProfile(false);
      fetchProfile();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating profile');
    }
  };

  const handleUpdatePassword = async () => {
    if (!passwords.oldPassword || !passwords.newPassword || !passwords.confirmPassword) {
      setError('All fields required');
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (passwords.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    try {
      await api.put('/auth/update-password', {
        oldPassword: passwords.oldPassword,
        newPassword: passwords.newPassword
      });
      setMessage('Password updated successfully');
      setShowPasswordForm(false);
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating password');
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}>Loading profile...</div>;

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <div>
            <h1 className="page-title">My Profile</h1>
            <div className={`role-badge ${isAdmin ? 'role-badge-owner' : 'role-badge-staff'}`}>
              {isAdmin ? '👑 Owner' : '👤 Staff Member'}
            </div>
          </div>
        </div>

        {message && <div className="alert-success">{message}</div>}
        {error && <div className="alert-error">{error}</div>}

        <div className="profile-section">
          <h2>Account Information</h2>
          <div className="profile-field">
            <label>Name</label>
            {editName ? (
              <div className="edit-field">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter new name"
                  className="input-field"
                />
                <div className="button-group">
                  <button className="btn btn-primary" onClick={handleUpdateName}>
                    Save
                  </button>
                  <button className="btn btn-secondary" onClick={() => { setEditName(false); setError(''); }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="profile-display">
                <p>{profile?.name}</p>
                <button className="btn btn-secondary" onClick={() => { setEditName(true); setNewName(profile?.name); setError(''); }}>
                  ✏️ Edit
                </button>
              </div>
            )}
          </div>

          <div className="profile-field">
            <label>Email</label>
            <p className="readonly-field">{profile?.email}</p>
          </div>

          <div className="profile-field">
            <label>Phone</label>
            <p className="readonly-field">{profile?.phone || <span style={{ color: '#64748b' }}>—</span>}</p>
          </div>

          {isAdmin && (
            <>
              <div className="profile-field">
                <label>Company</label>
                <p className="readonly-field">{profile?.company || <span style={{ color: '#64748b' }}>—</span>}</p>
              </div>

              <div className="profile-field">
                <label>GSTIN</label>
                <p className="readonly-field">{profile?.gst_number || <span style={{ color: '#64748b' }}>—</span>}</p>
              </div>

              <div className="profile-field">
                <label>Address</label>
                <p className="readonly-field">{profile?.address || <span style={{ color: '#64748b' }}>—</span>}</p>
              </div>

              <div className="profile-field">
                <label>Website</label>
                <p className="readonly-field">{profile?.website || <span style={{ color: '#64748b' }}>—</span>}</p>
              </div>
            </>
          )}

          <div className="profile-field">
            <label>Role</label>
            <p className="readonly-field role-field-text">{isAdmin ? '👑 Owner' : '👤 Staff Member'}</p>
          </div>
        </div>

        {isAdmin && (
          <div className="profile-section">
            <h2>Company / Admin Profile</h2>
            {!editProfile ? (
              <div>
                <button className="btn btn-secondary" onClick={openEditProfile}>✏️ Edit Company Profile</button>
              </div>
            ) : (
              <div>
                <div className="form-group">
                  <label>Company</label>
                  <input type="text" className="input-field" value={profileForm.company} onChange={e => setProfileForm({ ...profileForm, company: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>GSTIN</label>
                  <input type="text" className="input-field" value={profileForm.gst_number} onChange={e => setProfileForm({ ...profileForm, gst_number: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input type="text" className="input-field" value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <textarea className="input-field" rows={3} value={profileForm.address} onChange={e => setProfileForm({ ...profileForm, address: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Website</label>
                  <input type="text" className="input-field" value={profileForm.website} onChange={e => setProfileForm({ ...profileForm, website: e.target.value })} />
                </div>

                <div className="button-group">
                  <button className="btn btn-primary" onClick={handleUpdateProfile}>Save</button>
                  <button className="btn btn-secondary" onClick={() => setEditProfile(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {!isAdmin && (
          <div className="profile-section">
            <h2>Assigned Permissions</h2>
            {profile?.permissions && profile.permissions.filter(perm => perm.can_view || perm.can_edit || perm.can_delete).length > 0 ? (
              <div className="permissions-grid">
                {profile.permissions
                  .filter(perm => perm.can_view || perm.can_edit || perm.can_delete)
                  .map((perm) => (
                    <div key={perm.id} className="permission-card">
                      <h3>{perm.section}</h3>
                      <div className="permission-badges">
                        {perm.can_view && <span className="badge badge-view">👁️ View</span>}
                        {perm.can_edit && <span className="badge badge-edit">✏️ Edit</span>}
                        {perm.can_delete && <span className="badge badge-delete">🗑️ Delete</span>}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p>No permissions assigned yet</p>
            )}
          </div>
        )}

        <div className="profile-section">
          <h2>Security</h2>
          {!showPasswordForm ? (
            <button className="btn btn-secondary" onClick={() => { setShowPasswordForm(true); setError(''); }}>
              🔐 Change Password
            </button>
          ) : (
            <div className="password-form">
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={passwords.oldPassword}
                  onChange={(e) => setPasswords({ ...passwords, oldPassword: e.target.value })}
                  placeholder="Enter current password"
                  className="input-field"
                />
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  placeholder="Enter new password"
                  className="input-field"
                />
              </div>

              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  className="input-field"
                />
              </div>

              <div className="button-group">
                <button className="btn btn-primary" onClick={handleUpdatePassword}>
                  Update Password
                </button>
                <button className="btn btn-secondary" onClick={() => { setShowPasswordForm(false); setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' }); setError(''); }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
