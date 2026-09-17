import type { UserRole, UserProfile } from '../types/user';
import api from './api';

export interface AdminRegisterUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
}

export const getAllUsers = async (): Promise<UserProfile[]> => {
  const response = await api.get<UserProfile[]>('/users');
  return response.data;
};

export const getUserByUid = async (uid: string): Promise<UserProfile> => {
  const response = await api.get<UserProfile>(`/users/${uid}`);
  return response.data;
};

export const updateUserRole = async (uid: string, role: UserRole): Promise<UserProfile> => {
  const response = await api.patch<UserProfile>(`/users/${uid}/role`, null, {
    params: { role },
  });
  return response.data;
};

export const registerUserByAdmin = async (
  data: AdminRegisterUserRequest
): Promise<UserProfile> => {
  // 1. Call backend registration endpoint (creates user in Firebase Auth + Firestore profile with role CUSTOMER)
  const response = await api.post<{
    message: string;
    uid: string;
    email: string;
    role: string;
  }>('/auth/register', {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    password: data.password,
  });

  const uid = response.data.uid;

  // 2. If the admin selected a role other than CUSTOMER, immediately update role
  if (data.role && data.role !== 'CUSTOMER') {
    return await updateUserRole(uid, data.role);
  }

  return getUserByUid(uid);
};

export const getCurrentUserProfile = async (): Promise<UserProfile> => {
  const response = await api.get<UserProfile>('/users/me');
  return response.data;
};
