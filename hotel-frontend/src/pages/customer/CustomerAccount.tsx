import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import * as authService from '../../services/authService';
import {
  firebasePasswordError,
  passwordRules,
  type PasswordFormValues,
} from '../../schemas/profileSchemas';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  RECEPTIONIST: 'Receptionist',
  HOUSEKEEPING: 'Housekeeping',
  MAINTENANCE: 'Maintenance',
  ACCOUNTANT: 'Accountant',
  STAFF: 'Staff',
  CUSTOMER: 'Customer',
};

const formatCreatedAt = (value?: string): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatSignedInAt = (value?: number | null): string => {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function CustomerAccount() {
  const { user, firebaseUser, logout } = useAuth();
  const navigate = useNavigate();

  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({ mode: 'onTouched' });

  const onChangePassword = async (data: PasswordFormValues) => {
    setPasswordError('');
    setPasswordSuccess('');

    try {
      // Runs against Firebase Authentication directly — the Spring backend
      // never receives the password.
      await authService.changePassword(data.currentPassword, data.newPassword);
      reset();
      setPasswordSuccess('Your password has been changed.');
    } catch (err: any) {
      setPasswordError(
        firebasePasswordError(err?.code ?? '', err?.message ?? 'Failed to change your password.')
      );
    }
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  if (!user) return null;

  const isEnabled = user.enabled !== false;

  const accountRows = [
    { label: 'Email', value: user.email },
    { label: 'Role', value: ROLE_LABEL[user.role] ?? user.role },
    { label: 'Account Created', value: formatCreatedAt(user.createdAt) },
    { label: 'Last Sign-in', value: formatSignedInAt(firebaseUser?.metadata?.lastSignInTime ? Date.parse(firebaseUser.metadata.lastSignInTime) : null) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link to="/customer" className="hover:text-gray-700">
              My Account
            </Link>
            <span>/</span>
            <span className="text-gray-900">Account</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Account Settings</h1>
          <p className="mt-0.5 text-sm text-gray-600">
            Manage your sign-in credentials and account access.
          </p>
        </div>

        <Link
          to="/customer/profile"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
        >
          Edit Profile
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Account information */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-bold text-gray-900">Account Information</h2>
          <p className="mb-5 text-xs text-gray-500">
            Identify and access details for this account
          </p>

          <dl className="grid gap-4 sm:grid-cols-2">
            {accountRows.map((row) => (
              <div key={row.label} className="min-w-0">
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {row.label}
                </dt>
                <dd className="mt-1 break-words text-sm text-gray-900">{row.value}</dd>
              </div>
            ))}
          </dl>

          {/* Account status */}
          <div className="mt-6 border-t border-gray-100 pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Account Status
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                  isEnabled
                    ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                    : 'border-red-200 bg-red-100 text-red-800'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isEnabled ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                />
                {isEnabled ? 'Active' : 'Disabled'}
              </span>
              <span className="text-xs text-gray-500">
                {isEnabled
                  ? 'Your account is in good standing and can sign in.'
                  : 'Sign-in is blocked. Contact the front desk for help.'}
              </span>
            </div>
          </div>
        </div>

        {/* Session */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Session</h2>
          <p className="mb-5 text-xs text-gray-500">End your session on this device</p>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loggingOut && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {loggingOut ? 'Signing out…' : 'Log Out'}
          </button>

          <p className="mt-3 text-xs text-gray-500">
            You will be returned to the login page. Any unsaved changes are lost.
          </p>
        </div>
      </div>

      {/* Change password */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">Change Password</h2>
        <p className="mb-5 text-xs text-gray-500">
          Handled by Firebase Authentication. Your current password is required to
          confirm the change.
        </p>

        {passwordError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {passwordError}
          </div>
        )}
        {passwordSuccess && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {passwordSuccess}
          </div>
        )}

        <form
          onSubmit={handleSubmit(onChangePassword)}
          noValidate
          className="grid gap-5 sm:grid-cols-3"
        >
          <div>
            <label
              htmlFor="currentPassword"
              className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500"
            >
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 outline-none transition focus:ring-1 ${
                errors.currentPassword
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
              }`}
              {...register('currentPassword', passwordRules.currentPassword)}
            />
            {errors.currentPassword && (
              <p className="mt-1 text-xs text-red-500">{errors.currentPassword.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="newPassword"
              className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500"
            >
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 outline-none transition focus:ring-1 ${
                errors.newPassword
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
              }`}
              {...register('newPassword', passwordRules.newPassword)}
            />
            {errors.newPassword ? (
              <p className="mt-1 text-xs text-red-500">{errors.newPassword.message}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-400">
                At least 8 characters with upper, lower, number and symbol
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500"
            >
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 outline-none transition focus:ring-1 ${
                errors.confirmPassword
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
              }`}
              {...register('confirmPassword', passwordRules.confirmPassword(getValues))}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              {isSubmitting ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
