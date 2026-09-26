import type { UserRole } from '../types/user';

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  allowedRoles: UserRole[];
}

/**
 * The sidebar, role by role.
 *
 * Each item carries the roles allowed to see it; the sidebar filters this list
 * against the signed-in user. The set of items a role sees here is the same set
 * its routes allow, so nobody is shown a link that leads to a 403.
 *
 * There is no CUSTOMER entry: this is an internal tool for hotel employees.
 */
export const NAVIGATION_ITEMS: NavItem[] = [
  // ── Dashboards ──
  // ADMIN and MANAGER share one dashboard; /admin and /manager remain valid
  // routes for direct links, but only /dashboard appears here so neither role
  // sees the same entry twice.
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: 'dashboard',
    allowedRoles: ['ADMIN', 'MANAGER'],
  },
  {
    label: 'Dashboard',
    path: '/receptionist',
    icon: 'dashboard',
    allowedRoles: ['RECEPTIONIST'],
  },
  {
    label: 'Dashboard',
    path: '/housekeeping',
    icon: 'dashboard',
    allowedRoles: ['HOUSEKEEPING'],
  },
  {
    label: 'Dashboard',
    path: '/maintenance',
    icon: 'dashboard',
    allowedRoles: ['MAINTENANCE'],
  },
  {
    label: 'Dashboard',
    path: '/accountant',
    icon: 'dashboard',
    allowedRoles: ['ACCOUNTANT'],
  },

  // ── Rooms & Reservations ──
  // Each role that manages rooms gets its own path so the label can stay
  // "Rooms" without two entries colliding in the sidebar.
  {
    label: 'Rooms',
    path: '/receptionist/rooms',
    icon: 'rooms',
    allowedRoles: ['RECEPTIONIST'],
  },
  {
    label: 'Rooms',
    path: '/admin/rooms',
    icon: 'rooms',
    allowedRoles: ['ADMIN'],
  },
  {
    label: 'Rooms',
    path: '/manager/rooms',
    icon: 'rooms',
    allowedRoles: ['MANAGER'],
  },
  {
    label: 'Reservations',
    path: '/reservations',
    icon: 'reservations',
    allowedRoles: ['ADMIN', 'MANAGER', 'RECEPTIONIST'],
  },

  // ── Billing ──
  {
    label: 'Invoices',
    path: '/invoices',
    icon: 'invoices',
    allowedRoles: ['ADMIN', 'RECEPTIONIST', 'ACCOUNTANT'],
  },
  {
    label: 'Payments',
    path: '/payments',
    icon: 'payments',
    allowedRoles: ['ADMIN', 'RECEPTIONIST', 'ACCOUNTANT'],
  },

  // ── Facilities & Operations ──
  {
    label: 'Housekeeping',
    path: '/housekeeping/tasks',
    icon: 'housekeeping',
    allowedRoles: ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPING'],
  },
  {
    label: 'Maintenance',
    path: '/maintenance/tasks',
    icon: 'maintenance',
    allowedRoles: ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'MAINTENANCE'],
  },
  {
    label: 'Inventory',
    path: '/inventory',
    icon: 'inventory',
    allowedRoles: ['ADMIN', 'MANAGER'],
  },

  // ── Administration & Management ──
  // "Staff" is the employee roster; "Users" is the login accounts behind it.
  // ADMIN holds both; MANAGER sees the roster only, matching the backend.
  {
    label: 'Staff',
    path: '/staff',
    icon: 'staff',
    allowedRoles: ['ADMIN', 'MANAGER'],
  },
  {
    label: 'Finance',
    path: '/finance',
    icon: 'finance',
    allowedRoles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'],
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: 'reports',
    allowedRoles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'],
  },
  {
    label: 'Users',
    path: '/admin/users',
    icon: 'users',
    allowedRoles: ['ADMIN'],
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: 'account',
    allowedRoles: ['ADMIN', 'MANAGER'],
  },
];

/** The nav entries a given role should see, in order. */
export function navItemsForRole(role?: UserRole | string | null): NavItem[] {
  if (!role) {
    return [];
  }

  return NAVIGATION_ITEMS.filter((item) =>
    item.allowedRoles.includes(role as UserRole),
  );
}
