import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getRoleRedirectPath } from '../../utils/roleRedirect';
import {
  registerRules,
  type RegisterFormValues,
} from '../../schemas/authSchemas';

export default function Register() {
  const { user, loading, register: registerUser } = useAuth();
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState('');

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ mode: 'onTouched' });

  // If already authenticated, redirect to dashboard
  if (!loading && user) {
    return <Navigate to={getRoleRedirectPath(user.role)} replace />;
  }

  const onSubmit = async (data: RegisterFormValues) => {
    setApiError('');
    setSuccess('');

    try {
      await registerUser({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      });
      setSuccess('Account created successfully!');
    } catch (err: unknown) {
      if (
        err !== null &&
        typeof err === 'object' &&
        'response' in err &&
        err.response !== null &&
        typeof err.response === 'object' &&
        'data' in err.response
      ) {
        const axiosErr = err as {
          response: { data: { message?: string } };
        };
        setApiError(
          axiosErr.response.data.message ?? 'Registration failed',
        );
      } else if (err instanceof Error) {
        setApiError(err.message);
      } else {
        setApiError('An unexpected error occurred');
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">
          Hotel Management
        </h1>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-lg bg-white p-8 shadow"
          noValidate
        >
          <h2 className="mb-6 text-xl font-semibold text-gray-800">
            Create Account
          </h2>

          {apiError && (
            <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">
              {apiError}
            </p>
          )}
          {success && (
            <p className="mb-4 rounded bg-green-50 p-3 text-sm text-green-600">
              {success}
            </p>
          )}

          {/* First Name */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="First Name"
              className={`w-full rounded-md border px-4 py-3 text-sm outline-none transition focus:ring-2 ${
                errors.firstName
                  ? 'border-red-400 focus:ring-red-200'
                  : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
              }`}
              {...register('firstName', registerRules.firstName)}
            />
            {errors.firstName && (
              <p className="mt-1 text-xs text-red-500">
                {errors.firstName.message}
              </p>
            )}
          </div>

          {/* Last Name */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Last Name"
              className={`w-full rounded-md border px-4 py-3 text-sm outline-none transition focus:ring-2 ${
                errors.lastName
                  ? 'border-red-400 focus:ring-red-200'
                  : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
              }`}
              {...register('lastName', registerRules.lastName)}
            />
            {errors.lastName && (
              <p className="mt-1 text-xs text-red-500">
                {errors.lastName.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="mb-4">
            <input
              type="email"
              placeholder="Email"
              className={`w-full rounded-md border px-4 py-3 text-sm outline-none transition focus:ring-2 ${
                errors.email
                  ? 'border-red-400 focus:ring-red-200'
                  : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
              }`}
              {...register('email', registerRules.email)}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="mb-4">
            <input
              type="tel"
              placeholder="Phone (e.g. 0771234567)"
              className={`w-full rounded-md border px-4 py-3 text-sm outline-none transition focus:ring-2 ${
                errors.phone
                  ? 'border-red-400 focus:ring-red-200'
                  : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
              }`}
              {...register('phone', registerRules.phone)}
            />
            {errors.phone && (
              <p className="mt-1 text-xs text-red-500">
                {errors.phone.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="mb-4">
            <input
              type="password"
              placeholder="Password"
              className={`w-full rounded-md border px-4 py-3 text-sm outline-none transition focus:ring-2 ${
                errors.password
                  ? 'border-red-400 focus:ring-red-200'
                  : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
              }`}
              {...register('password', registerRules.password)}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="mb-6">
            <input
              type="password"
              placeholder="Confirm Password"
              className={`w-full rounded-md border px-4 py-3 text-sm outline-none transition focus:ring-2 ${
                errors.confirmPassword
                  ? 'border-red-400 focus:ring-red-200'
                  : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
              }`}
              {...register(
                'confirmPassword',
                registerRules.confirmPassword(getValues),
              )}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-500">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-indigo-600 py-3 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Creating account...' : 'Register'}
          </button>

          <p className="mt-4 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 hover:underline">
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
