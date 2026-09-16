import type { UserRole } from './user';

export type Role = UserRole;

// ── Request DTOs (match backend) ──

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// ── Response DTOs (match backend) ──

export interface RegisterResponse {
  message: string;
  uid: string;
  email: string;
  role: string;
}

export interface LoginResponse {
  message: string;
  idToken: string;
  refreshToken: string;
  localId: string;
  email: string;
  expiresIn: string;
}

// ── Frontend auth state ──

export interface AuthUser {
  uid: string;
  email: string;
  role: Role;
  displayName: string;
}

