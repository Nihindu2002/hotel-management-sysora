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

/**
 * Provisions a staff login (ADMIN only).
 *
 * The backend creates the Firebase Authentication account and the profile in
 * one step, with the role that was chosen here. There is no customer role: this
 * application only has staff accounts.
 */
export const registerUserByAdmin = async (
  data: AdminRegisterUserRequest
): Promise<UserProfile> => {
  const response = await api.post<{
    message: string;
    uid: string;
    email: string;
    role: string;
  }>('/users', {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    password: data.password,
    role: data.role,
  });

  return getUserByUid(response.data.uid);
};

/**
 * Retrieves the signed-in user's own profile.
 * Uses: GET /api/users/me (any authenticated role)
 */
export const getCurrentUser = async (): Promise<UserProfile> => {
  const response = await api.get<UserProfile>('/users/me');
  return response.data;
};

/**
 * Fields a user may change about themselves. There is deliberately no `email`
 * or `role` here: the backend's UpdateUserRequest does not carry them either,
 * so neither can be altered through this path.
 */
export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
  phone?: string;
}

/**
 * Updates the signed-in user's own profile.
 * Uses: PUT /api/users/me
 *
 * The backend resolves the target account from the Firebase token, so this can
 * only ever modify the caller's own record.
 */
export const updateProfile = async (
  data: UpdateProfileRequest
): Promise<UserProfile> => {
  const response = await api.put<UserProfile>('/users/me', data);
  return response.data;
};
