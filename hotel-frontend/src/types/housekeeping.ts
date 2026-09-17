export type HousekeepingTaskStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type HousekeepingTaskPriority =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'URGENT';

export type HousekeepingTaskType =
  | 'CHECKOUT_CLEANING'
  | 'REGULAR_CLEANING'
  | 'DEEP_CLEANING'
  | 'INSPECTION';

export interface HousekeepingTask {
  taskId: string;
  roomId: string;
  assignedTo?: string | null;
  taskType: HousekeepingTaskType;
  priority: HousekeepingTaskPriority;
  status: HousekeepingTaskStatus;
  notes?: string;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  updatedAt?: string;
}

export interface CreateHousekeepingTaskRequest {
  roomId: string;
  taskType: HousekeepingTaskType;
  priority: HousekeepingTaskPriority;
  notes?: string;
}

export interface AssignHousekeepingTaskRequest {
  staffUid: string;
}

