export type UserRole =
  | 'ADMIN'
  | 'MANAGER'
  | 'RECEPTIONIST'
  | 'HOUSEKEEPING'
  | 'MAINTENANCE'
  | 'ACCOUNTANT'
  | 'STAFF'
  | 'CUSTOMER';

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
