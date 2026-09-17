import type { RegisterOptions } from 'react-hook-form';

// ── Regex patterns ──
// Exported so the profile schemas validate against exactly the same rules
// rather than a second, drifting copy.

export const NAME_PATTERN = /^[A-Za-z][A-Za-z\s'-]{1,49}$/;
export const SRI_LANKAN_PHONE_PATTERN = /^(?:\+94|0)7[0-9]{8}$/;
export const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// ── Registration form shape ──

export interface RegisterFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

// ── Validation rules ──

export const registerRules = {
  firstName: {
    required: 'First name is required',
    minLength: { value: 2, message: 'First name must be at least 2 characters' },
    maxLength: { value: 50, message: 'First name must be at most 50 characters' },
    pattern: {
      value: NAME_PATTERN,
      message: 'First name must start with a letter and contain only letters, spaces, hyphens, or apostrophes',
    },
  } satisfies RegisterOptions<RegisterFormValues, 'firstName'>,

  lastName: {
    required: 'Last name is required',
    minLength: { value: 2, message: 'Last name must be at least 2 characters' },
    maxLength: { value: 50, message: 'Last name must be at most 50 characters' },
    pattern: {
      value: NAME_PATTERN,
      message: 'Last name must start with a letter and contain only letters, spaces, hyphens, or apostrophes',
    },
  } satisfies RegisterOptions<RegisterFormValues, 'lastName'>,

  email: {
    required: 'Email is required',
    pattern: {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Please enter a valid email address',
    },
  } satisfies RegisterOptions<RegisterFormValues, 'email'>,

  phone: {
    required: 'Phone number is required',
    pattern: {
      value: SRI_LANKAN_PHONE_PATTERN,
      message: 'Please enter a valid Sri Lankan phone number (e.g. 0771234567 or +94771234567)',
    },
  } satisfies RegisterOptions<RegisterFormValues, 'phone'>,

  password: {
    required: 'Password is required',
    minLength: { value: 8, message: 'Password must be at least 8 characters' },
    pattern: {
      value: PASSWORD_PATTERN,
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
    },
  } satisfies RegisterOptions<RegisterFormValues, 'password'>,

  confirmPassword: (
    getValues: () => RegisterFormValues,
  ): RegisterOptions<RegisterFormValues, 'confirmPassword'> => ({
    required: 'Please confirm your password',
    validate: (value) =>
      value === getValues().password || 'Passwords do not match',
  }),
};

// ── Login form shape ──

export interface LoginFormValues {
  email: string;
  password: string;
}

export const loginRules = {
  email: {
    required: 'Email is required',
    pattern: {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Please enter a valid email address',
    },
  } satisfies RegisterOptions<LoginFormValues, 'email'>,

  password: {
    required: 'Password is required',
  } satisfies RegisterOptions<LoginFormValues, 'password'>,
};

