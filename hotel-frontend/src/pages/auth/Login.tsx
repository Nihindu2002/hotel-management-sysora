import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getPostLoginPath } from '../../utils/roleRedirect';
import { loginRules, type LoginFormValues } from '../../schemas/authSchemas';

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ mode: 'onTouched' });

  // Already signed in: customers belong on the LUMI site, staff on their
  // dashboard — never back through the login form.
  if (!loading && user) {
    return <Navigate to={getPostLoginPath(user.role)} replace />;
  }

  const onSubmit = async (data: LoginFormValues) => {
    setApiError('');

    try {
      // The role drives where we land, so read it off the profile this call
      // returns rather than the `user` state, which has not re-rendered yet.
      const profile = await login(data.email, data.password);
      navigate(getPostLoginPath(profile?.role), { replace: true });
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes('auth/')) {
          setApiError('Invalid email or password');
        } else {
          setApiError(err.message);
        }
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
          <h2 className="mb-6 text-xl font-semibold text-gray-800">Login</h2>

          {apiError && (
            <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">
              {apiError}
            </p>
          )}

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
              {...register('email', loginRules.email)}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="mb-6">
            <input
              type="password"
              placeholder="Password"
              className={`w-full rounded-md border px-4 py-3 text-sm outline-none transition focus:ring-2 ${
                errors.password
                  ? 'border-red-400 focus:ring-red-200'
                  : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
              }`}
              {...register('password', loginRules.password)}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-indigo-600 py-3 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in...' : 'Login'}
          </button>

          <p className="mt-4 text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-indigo-600 hover:underline">
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
