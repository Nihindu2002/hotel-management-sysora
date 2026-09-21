import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRoleRedirectPath } from '../utils/roleRedirect';

/**
 * Guard for the customer's LUMI pages (the account area, the booking wizard).
 *
 * Signed-out visitors go to sign-in. Signed-in staff are sent on to their own
 * dashboard rather than to /unauthorized — they are in the wrong place, not
 * doing something forbidden, and they already have an equivalent staff page.
 */
export default function CustomerRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'CUSTOMER') {
    return <Navigate to={getRoleRedirectPath(user.role)} replace />;
  }

  return <Outlet />;
}
