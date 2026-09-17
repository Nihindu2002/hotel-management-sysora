import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { updateProfile } from '../../services/userService';
import { profileRules, type ProfileFormValues } from '../../schemas/profileSchemas';

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

/** `createdAt` is an ISO instant, so render it in the viewer's local timezone. */
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

export default function CustomerProfile() {
  const { user, refreshProfile } = useAuth();

  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    mode: 'onTouched',
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      phone: user?.phone ?? '',
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    setApiError('');
    setSuccess('');

    try {
      // The API resolves the account from the Firebase token, so this can only
      // ever write to the signed-in user's own record.
      const updated = await updateProfile({
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone?.trim() ? data.phone.trim() : undefined,
      });

      // Keep the header and any other consumer of auth state in step.
      await refreshProfile();

      reset({
        firstName: updated.firstName ?? '',
        lastName: updated.lastName ?? '',
        phone: updated.phone ?? '',
      });

      setSuccess('Profile updated successfully.');
    } catch (err: any) {
      setApiError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to update your profile.'
      );
    }
  };

  if (!user) return null;

  const readOnlyFields = [
    { label: 'Email', value: user.email, note: 'Cannot be changed' },
    {
      label: 'Role',
      value: ROLE_LABEL[user.role] ?? user.role,
      note: 'Assigned by an administrator',
    },
    {
      label: 'Account Created',
      value: formatCreatedAt(user.createdAt),
      note: 'When you registered',
    },
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
            <span className="text-gray-900">Profile</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="mt-0.5 text-sm text-gray-600">
            View your account details and update your contact information.
          </p>
        </div>

        <Link
          to="/customer/account"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
        >
          Account Settings
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Editable details */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-bold text-gray-900">Personal Information</h2>
          <p className="mb-5 text-xs text-gray-500">
            Changes are saved to your account immediately.
          </p>

          {apiError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {apiError}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="firstName"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 outline-none transition focus:ring-1 ${
                    errors.firstName
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                  {...register('firstName', profileRules.firstName)}
                />
                {errors.firstName && (
                  <p className="mt-1 text-xs text-red-500">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 outline-none transition focus:ring-1 ${
                    errors.lastName
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                  {...register('lastName', profileRules.lastName)}
                />
                {errors.lastName && (
                  <p className="mt-1 text-xs text-red-500">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="phone"
                className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500"
              >
                Phone
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="0771234567"
                className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 outline-none transition focus:ring-1 sm:max-w-xs ${
                  errors.phone
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                }`}
                {...register('phone', profileRules.phone)}
              />
              {errors.phone ? (
                <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>
              ) : (
                <p className="mt-1 text-xs text-gray-400">Optional</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-5">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                {isSubmitting ? 'Saving…' : 'Save Changes'}
              </button>

              <button
                type="button"
                disabled={isSubmitting || !isDirty}
                onClick={() =>
                  reset({
                    firstName: user.firstName ?? '',
                    lastName: user.lastName ?? '',
                    phone: user.phone ?? '',
                  })
                }
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* Read-only details */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Account Details</h2>
          <p className="mb-5 text-xs text-gray-500">Managed by the hotel</p>

          <dl className="space-y-4">
            {readOnlyFields.map((field) => (
              <div key={field.label}>
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {field.label}
                </dt>
                <dd className="mt-1 break-words text-sm text-gray-900">{field.value}</dd>
                <p className="mt-0.5 text-[11px] text-gray-400">{field.note}</p>
              </div>
            ))}
          </dl>

          <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
            <p className="text-xs text-gray-600">
              Your email address and role are read-only. Contact the front desk if
              either needs to change.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
