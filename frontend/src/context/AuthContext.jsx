import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('orbem_user')); } catch { return null; }
  });
  const [permissions, setPermissions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('orbem_permissions')); } catch { return null; }
  });

  // Fetch and update user profile (admin or staff)
  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      const updatedUser = {
        id: res.data.id,
        name: res.data.name,
        email: res.data.email,
        role: res.data.role,
        phone: res.data.phone,
        company: res.data.company,
        gst_number: res.data.gst_number,
        address: res.data.address,
        website: res.data.website
      };
      
      // Update user if name changed (admin updated it)
      // Update stored user object whenever any profile fields change
      if (!user || JSON.stringify(updatedUser) !== JSON.stringify(user)) {
        setUser(updatedUser);
        localStorage.setItem('orbem_user', JSON.stringify(updatedUser));
      }

      // Update permissions if staff
      if (res.data.role === 'staff' && res.data.permissions && Array.isArray(res.data.permissions)) {
        const permObj = {};
        res.data.permissions.forEach(perm => {
          permObj[perm.section] = {
            can_view: perm.can_view,
            can_edit: perm.can_edit,
            can_delete: perm.can_delete
          };
        });
        setPermissions(permObj);
        localStorage.setItem('orbem_permissions', JSON.stringify(permObj));
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  };

  // Fetch permissions when user changes
  useEffect(() => {
    if (user) {
      fetchProfile();
      // Poll for updates every 10 seconds for real-time sync
      const interval = setInterval(fetchProfile, 10000);
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  const login = (token, userData) => {
    localStorage.setItem('orbem_token', token);
    localStorage.setItem('orbem_user', JSON.stringify(userData));
    setUser(userData);
    
    // Load permissions from localStorage (set by Login page)
    try {
      const savedPerms = localStorage.getItem('orbem_permissions');
      if (savedPerms) {
        setPermissions(JSON.parse(savedPerms));
      }
    } catch (err) {
      console.error('Error loading permissions:', err);
    }
  };

  const logout = () => {
    localStorage.removeItem('orbem_token');
    localStorage.removeItem('orbem_user');
    localStorage.removeItem('orbem_permissions');
    setUser(null);
    setPermissions(null);
  };

  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff';

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isAuthenticated: !!user,
      isAdmin,
      isStaff,
      role: user?.role,
      permissions,
      refreshProfile: fetchProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
