import type { UserRole } from '../types/user';

/**
 * Maps a user's role to their designated dashboard path.
 * STAFF is routed to /unauthorized until a dedicated dashboard is implemented.
 */
export function getRoleRedirectPath(role?: UserRole | string | null): string {
  if (!role) {
    return '/login';
  }

  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'MANAGER':
      return '/manager';
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

