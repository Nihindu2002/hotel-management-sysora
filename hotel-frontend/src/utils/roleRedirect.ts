import type { UserRole } from '../types/user';

/**
 * Maps a user's role to their designated dashboard path.
 * STAFF is routed to /unauthorized until a dedicated dashboard is implemented.
 *
 * ADMIN and MANAGER land on /dashboard, which is also the sidebar's Dashboard
 * entry — /admin and /manager render the same page as aliases.
 */
export function getRoleRedirectPath(role?: UserRole | string | null): string {
  if (!role) {
    return '/login';
  }

  switch (role) {
    case 'ADMIN':
      return '/dashboard';
    case 'MANAGER':
      return '/dashboard';
    case 'RECEPTIONIST':
      return '/receptionist';
    case 'HOUSEKEEPING':
      return '/housekeeping';
    case 'MAINTENANCE':
      return '/maintenance';
    case 'ACCOUNTANT':
      return '/accountant';
    case 'CUSTOMER':
      return '/customer';
    case 'STAFF':
      return '/unauthorized';
    default:
      return '/unauthorized';
  }
}

