import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Invoices from './pages/Invoices';
import Payments from './pages/Payments';
import Quotations from './pages/Quotations';
import StaffManagement from './pages/StaffManagement';
import StaffProfile from './pages/StaffProfile';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PermissionRoute } from './components/PermissionRoute';

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      
      {/* Staff/User Routes */}
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="customers" element={<PermissionRoute requiredPermission="customers"><Customers /></PermissionRoute>} />
        <Route path="invoices" element={<PermissionRoute requiredPermission="invoices"><Invoices /></PermissionRoute>} />
        <Route path="payments" element={<PermissionRoute requiredPermission="payments"><Payments /></PermissionRoute>} />
        <Route path="quotations" element={<PermissionRoute requiredPermission="quotations"><Quotations /></PermissionRoute>} />
        
        {/* Admin Routes */}
        <Route path="admin/staff" element={<StaffManagement />} />
        
        {/* Staff Profile Route */}
        <Route path="profile" element={<StaffProfile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
