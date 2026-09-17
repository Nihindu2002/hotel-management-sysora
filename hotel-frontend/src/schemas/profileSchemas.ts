import type { RegisterOptions } from 'react-hook-form';
import {
  NAME_PATTERN,
  PASSWORD_PATTERN,
  SRI_LANKAN_PHONE_PATTERN,
} from './authSchemas';

// ── Profile form shape ──

/**
 * Mirrors the backend's UpdateUserRequest: first name, last name, and phone
 * only. Email and role are absent by design and rendered read-only.
 */
export interface ProfileFormValues {
  firstName: string;
  lastName: string;
  phone: string;
}

export const profileRules = {
  firstName: {
    required: 'First name is required',
    minLength: { value: 2, message: 'First name must be at least 2 characters' },
    maxLength: { value: 50, message: 'First name must be at most 50 characters' },
    pattern: {
      value: NAME_PATTERN,
      message:
        'First name must start with a letter and contain only letters, spaces, hyphens, or apostrophes',
    },
  } satisfies RegisterOptions<ProfileFormValues, 'firstName'>,

  lastName: {
    required: 'Last name is required',
    minLength: { value: 2, message: 'Last name must be at least 2 characters' },
    maxLength: { value: 50, message: 'Last name must be at most 50 characters' },
    pattern: {
      value: NAME_PATTERN,
      message:
        'Last name must start with a letter and contain only letters, spaces, hyphens, or apostrophes',
    },
  } satisfies RegisterOptions<ProfileFormValues, 'lastName'>,

  // Optional to match the API — UpdateUserRequest leaves phone nullable — but
  // validated whenever a value is supplied.
  phone: {
    validate: (value) =>
      !value ||
      value.trim() === '' ||
      SRI_LANKAN_PHONE_PATTERN.test(value.trim()) ||
      'Please enter a valid Sri Lankan phone number (e.g. 0771234567 or +94771234567)',
  } satisfies RegisterOptions<ProfileFormValues, 'phone'>,
};

// ── Password change form shape ──

export interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const passwordRules = {
  currentPassword: {
    required: 'Current password is required',
  } satisfies RegisterOptions<PasswordFormValues, 'currentPassword'>,

  newPassword: {
    required: 'New password is required',
    minLength: { value: 8, message: 'Password must be at least 8 characters' },
    pattern: {
      value: PASSWORD_PATTERN,
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
    },
  } satisfies RegisterOptions<PasswordFormValues, 'newPassword'>,

  confirmPassword: (
    getValues: () => PasswordFormValues,
  ): RegisterOptions<PasswordFormValues, 'confirmPassword'> => ({
    required: 'Please confirm your new password',
    validate: (value) =>
      value === getValues().newPassword || 'Passwords do not match',
  }),
};

/**
 * Firebase error codes mapped to messages a user can act on. Anything
 * unrecognised falls through to the raw Firebase message.
 */
export const firebasePasswordError = (code: string, fallback: string): string => {
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Your current password is incorrect.';
    case 'auth/weak-password':
      return 'That password is too weak. Use at least 8 characters with upper and lower case, a number, and a symbol.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/requires-recent-login':
      return 'For security, please sign out and sign back in before changing your password.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    default:
      return fallback;
  }
};
