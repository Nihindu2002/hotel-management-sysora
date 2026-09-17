import api from './api';
import type {
  MaintenanceTask,
  MaintenanceDashboardStats,
  MaintenanceTaskFilters,
  CreateMaintenanceTaskRequest,
  CompleteMaintenanceTaskRequest,
} from '../types/maintenance';
import type { Staff } from '../types/staff';

export const getDashboard = async (): Promise<MaintenanceDashboardStats> => {
  const response = await api.get<MaintenanceDashboardStats>('/maintenance/dashboard');
  return response.data;
};

export const getAllTasks = async (
  filters: MaintenanceTaskFilters = {}
): Promise<MaintenanceTask[]> => {
  const { status, priority, issueType, assignedTo, roomId } = filters;

  const response = await api.get<MaintenanceTask[]>('/maintenance/tasks', {
    params: {
      ...(status && status !== 'ALL' ? { status } : {}),
      ...(priority && priority !== 'ALL' ? { priority } : {}),
      ...(issueType && issueType !== 'ALL' ? { issueType } : {}),
      ...(assignedTo ? { assignedTo } : {}),
      ...(roomId ? { roomId } : {}),
    },
  });
  return response.data;
};

export const getTaskById = async (taskId: string): Promise<MaintenanceTask> => {
  const response = await api.get<MaintenanceTask>(`/maintenance/tasks/${taskId}`);
  return response.data;
};

export const getMyTasks = async (): Promise<MaintenanceTask[]> => {
  const response = await api.get<MaintenanceTask[]>('/maintenance/my');
  return response.data;
};

export const getTasksByRoomId = async (roomId: string): Promise<MaintenanceTask[]> => {
  const response = await api.get<MaintenanceTask[]>(`/maintenance/rooms/${roomId}/tasks`);
  return response.data;
};

export const createMaintenanceTask = async (
  request: CreateMaintenanceTaskRequest
): Promise<MaintenanceTask> => {
  const response = await api.post<MaintenanceTask>('/maintenance/tasks', request);
  return response.data;
};

export const assignMaintenanceTask = async (
  taskId: string,
  staffUid: string
): Promise<MaintenanceTask> => {
  const response = await api.patch<MaintenanceTask>(
    `/maintenance/tasks/${taskId}/assign`,
    { staffUid }
  );
  return response.data;
};

export const startMaintenanceTask = async (
  taskId: string
): Promise<MaintenanceTask> => {
  const response = await api.patch<MaintenanceTask>(
    `/maintenance/tasks/${taskId}/start`
  );
  return response.data;
};

export const completeMaintenanceTask = async (
  taskId: string,
  payload: CompleteMaintenanceTaskRequest = {}
): Promise<MaintenanceTask> => {
  const response = await api.patch<MaintenanceTask>(
    `/maintenance/tasks/${taskId}/complete`,
    payload
  );
  return response.data;
};

export const updateMaintenanceCost = async (
  taskId: string,
  actualCost: number
): Promise<MaintenanceTask> => {
  const response = await api.patch<MaintenanceTask>(
    `/maintenance/tasks/${taskId}/cost`,
    { actualCost }
  );
  return response.data;
};

export const cancelMaintenanceTask = async (
  taskId: string
): Promise<MaintenanceTask> => {
  const response = await api.patch<MaintenanceTask>(
    `/maintenance/tasks/${taskId}/cancel`
  );
  return response.data;
};

/** Active staff belonging to the MAINTENANCE department, for assignment. */
export const getEligibleMaintenanceStaff = async (): Promise<Staff[]> => {
  const response = await api.get<Staff[]>('/staff', {
    params: {
      department: 'MAINTENANCE',
      status: 'ACTIVE',
    },
  });
  return response.data;
};
