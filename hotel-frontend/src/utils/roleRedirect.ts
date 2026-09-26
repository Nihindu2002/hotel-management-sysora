import type { UserRole } from '../types/user';

/**
 * Where a user is sent when they have no business being where they are.
 *
 * Every role is a hotel employee, so every path here is a staff dashboard.
 * There is no customer destination and no public landing page.
 */
export function getRoleRedirectPath(role?: UserRole | string | null): string {
  if (!role) {
    return '/login';
  }

  switch (role) {
    case 'ADMIN':
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
    default:
      return '/unauthorized';
  }
}

/**
 * Where a signed-in user belongs after signing in.
 *
 * The application opens on sign-in — there is no public page to land on first.
 */
export function getPostLoginPath(role?: UserRole | string | null): string {
  return getRoleRedirectPath(role);
}
