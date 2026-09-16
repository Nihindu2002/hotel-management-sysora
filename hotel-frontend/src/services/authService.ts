import {
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import api from '../lib/api';
import type { RegisterRequest, RegisterResponse } from '../types/auth';

/**
 * Register a new user.
 *
 * 1. Calls the backend to create Firebase Auth user + Firestore profile.
 * 2. Signs in on the client side so the Firebase SDK manages the session.
 */
export async function register(
  data: RegisterRequest,
): Promise<RegisterResponse> {
  const response = await api.post<RegisterResponse>('/auth/register', data);

  // Sign in on the client side for session management & auto token refresh
  await signInWithEmailAndPassword(auth, data.email, data.password);

  return response.data;
}

/**
 * Login an existing user.
 *
 * Uses Firebase client SDK directly for:
 * - Automatic ID token refresh
 * - Persistent session via onAuthStateChanged
 */
export async function login(
  email: string,
  password: string,
): Promise<FirebaseUser> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

/**
 * Sign out the current user.
 */
export async function logout(): Promise<void> {
  await signOut(auth);
}

/**
 * Get the current user's ID token.
 * Returns null if not signed in.
 */
export async function getCurrentToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

