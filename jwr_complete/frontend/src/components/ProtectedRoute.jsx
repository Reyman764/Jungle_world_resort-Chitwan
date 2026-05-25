import { Navigate, Outlet } from 'react-router-dom';

/**
 * ProtectedRoute
 * Wraps admin routes — redirects to /staff-login if:
 *   • No JWT token in localStorage
 *   • User role is not admin / manager / staff
 */
export default function ProtectedRoute() {
  const token = localStorage.getItem('token');
  const user  = localStorage.getItem('user');

  if (!token || !user) {
    return <Navigate to="/staff-login" replace />;
  }

  try {
    const userData   = JSON.parse(user);
    const validRoles = ['admin', 'manager', 'staff'];
    if (!validRoles.includes(userData.role)) {
      return <Navigate to="/staff-login" replace />;
    }
    return <Outlet />;
  } catch {
    return <Navigate to="/staff-login" replace />;
  }
}
