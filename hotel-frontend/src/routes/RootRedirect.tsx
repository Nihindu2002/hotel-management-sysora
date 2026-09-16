import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRoleRedirectPath } from '../utils/roleRedirect';

/**
 * Root route handler:
 * - If authenticated → redirect to role-based dashboard via roleRedirect
 * - If loading → show loading
 * - If not authenticated → redirect to /login
 */
export default function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  if (user) {
    return <Navigate to={getRoleRedirectPath(user.role)} replace />;
  }

  return <Navigate to="/login" replace />;
}
