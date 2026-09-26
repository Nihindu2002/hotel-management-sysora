import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

/**
 * Login an existing user.
 *
 * Uses the Firebase client SDK directly for automatic ID token refresh and a
 * session that persists via onAuthStateChanged.
 *
 * There is no register function: accounts are provisioned for hotel employees
 * by an administrator, and the application has no public sign-up.
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

