import type { UserRole } from '../types/user';

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  allowedRoles: UserRole[];
}

export const NAVIGATION_ITEMS: NavItem[] = [
  // ── Role Dashboards ──
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
  // CUSTOMER has no entries here on purpose: customers never render inside
  // DashboardLayout. Their pages live in the LUMI site (see pages/site) and are
  // navigated by the account sub-nav in pages/site/components/AccountLayout.

  // ── Operations & Front Desk ──
  {
    label: 'Rooms',
    path: '/receptionist/rooms',
    icon: 'rooms',
    allowedRoles: ['RECEPTIONIST'],
  },
  {
    label: 'Manage Rooms',
    path: '/admin/rooms',
    icon: 'rooms',
    allowedRoles: ['ADMIN'],
  },
  {
    label: 'Manage Rooms',
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

  // ── Billing & Finance ──
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
    allowedRoles: ['ADMIN', 'MANAGER', 'HOUSEKEEPING'],
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
    allowedRoles: [
      'ADMIN',
      'MANAGER',
      'RECEPTIONIST',
      'STAFF',
      'HOUSEKEEPING',
      'MAINTENANCE',
    ],
  },

  // ── Administration & Management ──

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
    allowedRoles: ['ADMIN', 'MANAGER'],
  },
  {
    label: 'Users',
    path: '/admin/users',
    icon: 'users',
    allowedRoles: ['ADMIN'],
  },
];

