import api from './api';
import type {
  Staff,
  CreateStaffRequest,
  UpdateStaffRequest,
  StaffDepartment,
  EmploymentStatus,
} from '../types/staff';

export const getAllStaff = async (
  department?: StaffDepartment,
  status?: EmploymentStatus
): Promise<Staff[]> => {
  const response = await api.get<Staff[]>('/staff', {
    params: {
      ...(department ? { department } : {}),
      ...(status ? { status } : {}),
    },
  });
  return response.data;
};

export const getStaffById = async (staffId: string): Promise<Staff> => {
  const response = await api.get<Staff>(`/staff/${staffId}`);
  return response.data;
};

export const getStaffByUserUid = async (userUid: string): Promise<Staff> => {
  const response = await api.get<Staff>(`/staff/user/${userUid}`);
  return response.data;
};

export const createStaff = async (request: CreateStaffRequest): Promise<Staff> => {
  const response = await api.post<Staff>('/staff', request);
  return response.data;
};

export const updateStaff = async (
  staffId: string,
  request: UpdateStaffRequest
): Promise<Staff> => {
  const response = await api.put<Staff>(`/staff/${staffId}`, request);
  return response.data;
};

export const updateStaffStatus = async (
  staffId: string,
  employmentStatus: EmploymentStatus
): Promise<Staff> => {
  const response = await api.patch<Staff>(`/staff/${staffId}/status`, {
    employmentStatus,
  });
  return response.data;
};

export const deleteStaff = async (staffId: string): Promise<void> => {
  await api.delete(`/staff/${staffId}`);
};

