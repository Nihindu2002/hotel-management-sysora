export type StaffDepartment =
  | 'FRONT_OFFICE'
  | 'HOUSEKEEPING'
  | 'MAINTENANCE'
  | 'RESTAURANT'
  | 'KITCHEN'
  | 'FINANCE'
  | 'MANAGEMENT'
  | 'IT'
  | 'SECURITY'
  | 'OTHER';

export type EmploymentStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'ON_LEAVE'
  | 'TERMINATED';

export interface Staff {
  staffId: string;
  userUid: string;
  employeeId: string;
  department: StaffDepartment;
  position: string;
  hireDate: string; // ISO LocalDate string "YYYY-MM-DD"
  salary: number | null;
  employmentStatus: EmploymentStatus;
  emergencyContact?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateStaffRequest {
  userUid: string;
  employeeId: string;
  department: StaffDepartment;
  position: string;
  hireDate: string;
  salary?: number | null;
  emergencyContact?: string;
}

export interface UpdateStaffRequest {
  employeeId?: string;
  department?: StaffDepartment;
  position?: string;
  hireDate?: string;
  salary?: number | null;
  emergencyContact?: string;
}

