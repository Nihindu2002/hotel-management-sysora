import type { UserRole } from '../types/user';

/**
 * The public LUMI landing page, served at the site root.
 *
 * This is home for guests — customers and signed-out visitors. Staff never
 * sign in to it; getPostLoginPath sends them to their own dashboard.
 */
export const LANDING_PATH = '/';

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
      // Customers have no dashboard — the LUMI site is their home, and the
      // account area is where their bookings live.
      return '/account';
    case 'STAFF':
      return '/unauthorized';
    default:
      return '/unauthorized';
  }
}

/**
 * Where a signed-in user belongs after the auth screens.
 *
 * Only customers land on the public LUMI site: it is a marketing page for
 * guests, and a receptionist or housekeeper signing in there would have to
 * click through it to reach their own work. Every staff role goes straight to
 * its dashboard instead.
 */
export function getPostLoginPath(role?: UserRole | string | null): string {
  if (!role) {
    return '/login';
  }

  return role === 'CUSTOMER' ? LANDING_PATH : getRoleRedirectPath(role);
}

