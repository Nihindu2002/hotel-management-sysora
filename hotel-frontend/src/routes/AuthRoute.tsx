import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Requires a signed-in user but no particular role.
 *
 * Used for pages that belong to every role rather than to a module — currently
 * notifications, which are per-user rather than per-role.
 */
export default function AuthRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
