/**
 * Roles a hotel employee can hold.
 *
 * There is no CUSTOMER role: this is a staff-operated application, and the
 * occupant of a room is recorded on their reservation rather than given an
 * account.
 */
export type UserRole =
  | 'ADMIN'
  | 'MANAGER'
  | 'RECEPTIONIST'
  | 'HOUSEKEEPING'
  | 'MAINTENANCE'
  | 'ACCOUNTANT'
  | 'STAFF';

export interface UserProfile {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: UserRole;
  enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
