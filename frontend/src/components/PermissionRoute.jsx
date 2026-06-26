import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function PermissionRoute({ children, requiredPermission }) {
  const { isAuthenticated, isAdmin, permissions } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Admin can access everything
  if (isAdmin) {
    return children;
  }

  // For staff, check if they have view permission for the required section
  if (requiredPermission && permissions) {
    const perm = permissions[requiredPermission];
    
    // Check if permission exists AND can_view is true (handle both boolean and integer)
    if (!perm || (perm.can_view !== true && perm.can_view !== 1)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
