import api from './api';
import type { UserProfile } from '../types/user';

export const getCurrentUserProfile = async (): Promise<UserProfile> => {
  const response = await api.get<UserProfile>('/users/me');
  return response.data;
};

