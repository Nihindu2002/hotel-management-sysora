import type { UserRole } from './user';

export type Role = UserRole;

// ── Request DTOs (match backend) ──

export interface LoginRequest {
  email: string;
  password: string;
}

// ── Response DTOs (match backend) ──

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

