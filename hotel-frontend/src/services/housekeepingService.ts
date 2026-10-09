import api from './api';
import type {
  HousekeepingDashboard,
  HousekeepingTask,
  CreateHousekeepingTaskRequest,
} from '../types/housekeeping';
import type { Staff } from '../types/staff';

export const getAllTasks = async (): Promise<HousekeepingTask[]> => {
  const response = await api.get<HousekeepingTask[]>('/housekeeping/tasks');
  return response.data;
};

/**
 * Dashboard counts, including completed-today and rooms awaiting cleaning.
 * Uses: GET /api/housekeeping/dashboard
 */
export const getDashboard = async (): Promise<HousekeepingDashboard> => {
  const response = await api.get<HousekeepingDashboard>('/housekeeping/dashboard');
  return response.data;
};

export const getTaskById = async (taskId: string): Promise<HousekeepingTask> => {
  const response = await api.get<HousekeepingTask>(`/housekeeping/tasks/${taskId}`);
  return response.data;
};

export const getMyTasks = async (): Promise<HousekeepingTask[]> => {
  const response = await api.get<HousekeepingTask[]>('/housekeeping/my');
  return response.data;
};

export const getTasksByRoomId = async (roomId: string): Promise<HousekeepingTask[]> => {
  const response = await api.get<HousekeepingTask[]>(`/housekeeping/rooms/${roomId}/tasks`);
  return response.data;
};

export const createHousekeepingTask = async (
  request: CreateHousekeepingTaskRequest
): Promise<HousekeepingTask> => {
  const response = await api.post<HousekeepingTask>('/housekeeping/tasks', request);
  return response.data;
};

export const assignHousekeepingTask = async (
  taskId: string,
  staffUid: string
): Promise<HousekeepingTask> => {
  const response = await api.patch<HousekeepingTask>(
    `/housekeeping/tasks/${taskId}/assign`,
    { staffUid }
  );
  return response.data;
};

export const startHousekeepingTask = async (
  taskId: string,
  items: { itemId: string; quantity: number }[] = [],
): Promise<HousekeepingTask> => {
  const response = await api.patch<HousekeepingTask>(
    `/housekeeping/tasks/${taskId}/start`,
    { items },
  );
  return response.data;
};

export const completeHousekeepingTask = async (
  taskId: string
): Promise<HousekeepingTask> => {
  const response = await api.patch<HousekeepingTask>(
    `/housekeeping/tasks/${taskId}/complete`
  );
  return response.data;
};

export const cancelHousekeepingTask = async (
  taskId: string
): Promise<HousekeepingTask> => {
  const response = await api.patch<HousekeepingTask>(
    `/housekeeping/tasks/${taskId}/cancel`
  );
  return response.data;
};

export const getEligibleHousekeepingStaff = async (): Promise<Staff[]> => {
  const response = await api.get<Staff[]>('/staff', {
    params: {
      department: 'HOUSEKEEPING',
      status: 'ACTIVE',
    },
  });
  return response.data;
};

