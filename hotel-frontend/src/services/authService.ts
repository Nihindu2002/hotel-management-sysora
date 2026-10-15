import api, { withTransientRetry } from './api';

const TOKEN_KEY = 'hotel_session_token';

export interface LoginResponse {
  message: string;
  idToken: string;
  localId: string;
  email: string;
  expiresIn: string;
}

const LOGIN_TIMEOUT_MS = 60_000;

export async function login(email: string, password: string): Promise<LoginResponse> {
  return withTransientRetry(async () => {
    const response = await api.post<LoginResponse>('/auth/login', { email, password }, {
      timeout: LOGIN_TIMEOUT_MS,
    });
    localStorage.setItem(TOKEN_KEY, response.data.idToken);
    return response.data;
  });
}

export async function logout(): Promise<void> {
  try {
    if (localStorage.getItem(TOKEN_KEY)) await api.post('/auth/logout');
  } finally {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getCurrentToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.post('/auth/change-password', { currentPassword, newPassword });
  localStorage.removeItem(TOKEN_KEY);
}
