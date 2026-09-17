import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
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

/**
 * Change the signed-in user's password.
 *
 * Runs entirely against Firebase Authentication — the Spring backend never sees
 * the password. Firebase requires a recent login for this operation, so the
 * current password is used to reauthenticate first, which both proves the
 * caller knows it and refreshes that window.
 *
 * Throws Firebase errors; callers should map `error.code` to a readable message.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = auth.currentUser;

  if (!user || !user.email) {
    throw new Error('You must be signed in to change your password.');
  }

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

