export type MaintenanceStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type MaintenanceIssueType =
  | 'ELECTRICAL'
  | 'PLUMBING'
  | 'AIR_CONDITIONING'
  | 'FURNITURE'
  | 'APPLIANCE'
  | 'NETWORK'
  | 'STRUCTURAL'
  | 'OTHER';

export interface MaintenanceTask {
  taskId: string;
  roomId: string;
  reportedBy?: string | null;
  assignedTo?: string | null;
  issueType: MaintenanceIssueType;
  priority: MaintenancePriority;
  description: string;
  status: MaintenanceStatus;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  updatedAt?: string;
  actualCost?: number | null;
  completionNotes?: string | null;
}

export interface MaintenanceDashboardStats {
  pendingTasks: number;
  assignedTasks: number;
  inProgressTasks: number;
  completedToday: number;
  highPriorityActiveTasks: number;
  cancelledTasks: number;
  totalTasks: number;
  totalMaintenanceCost: number;
}

export interface MaintenanceTaskFilters {
  status?: MaintenanceStatus | 'ALL';
  priority?: MaintenancePriority | 'ALL';
  issueType?: MaintenanceIssueType | 'ALL';
  assignedTo?: string;
  roomId?: string;
}

export interface CreateMaintenanceTaskRequest {
  roomId: string;
  issueType: MaintenanceIssueType;
  priority: MaintenancePriority;
  description: string;
}

export interface CompleteMaintenanceTaskRequest {
  actualCost?: number;
  completionNotes?: string;
}
