import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
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

  // Already signed in: go straight to the dashboard for this role rather than
  // back through the login form.
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
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-navy px-4 py-8 sm:px-8"
      style={{
        backgroundImage:
          "linear-gradient(115deg, rgba(15,23,42,.84), rgba(30,58,138,.58)), url('/images/hotel-login-background.jpg')",
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-navy/20 via-transparent to-navy/60" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/30 bg-white/90 shadow-2xl shadow-navy/40 backdrop-blur-xl md:min-h-[570px] md:grid-cols-[1.08fr_.92fr]">
        <section className="flex items-center justify-center px-6 py-10 sm:px-12 md:px-14">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-gold shadow-lg shadow-navy/20">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M15 9h.01M9 13h.01M15 13h.01M10 21v-4h4v4" />
                </svg>
              </span>
              <div>
                <h1 className="text-lg font-bold tracking-wide text-navy">HOTEL MANAGEMENT</h1>
                <p className="text-xs font-medium tracking-widest text-muted">STAFF PORTAL</p>
              </div>
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl">Welcome back</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Sign in to manage your hotel operations.</p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
              {apiError && (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger-ink">
                  {apiError}
                </p>
              )}

              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-sm font-semibold text-ink">Email address</label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  placeholder="you@hotel.com"
                  className={`w-full rounded-xl border bg-white/80 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-gray-400 focus:ring-4 ${
                    errors.email
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                      : 'border-line focus:border-royal focus:ring-royal/10'
                  }`}
                  {...register('email', loginRules.email)}
                />
                {errors.email && <p className="mt-1.5 text-xs text-danger-ink">{errors.email.message}</p>}
              </div>

              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-sm font-semibold text-ink">Password</label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className={`w-full rounded-xl border bg-white/80 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-gray-400 focus:ring-4 ${
                    errors.password
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                      : 'border-line focus:border-royal focus:ring-royal/10'
                  }`}
                  {...register('password', loginRules.password)}
                />
                {errors.password && <p className="mt-1.5 text-xs text-danger-ink">{errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-navy/20 transition hover:bg-royal focus:outline-none focus:ring-4 focus:ring-royal/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Signing in…</>
                ) : 'Sign in'}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-muted">Access is provided by your hotel administrator.</p>
          </div>
        </section>

        <aside className="relative flex min-h-52 flex-col justify-between overflow-hidden bg-navy px-7 py-8 text-white sm:px-12 sm:py-10 md:min-h-full">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-white/10" />
          <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full border border-gold/30" />
          <div className="absolute bottom-0 right-0 h-1.5 w-2/3 bg-gold" />

          <div className="relative">
            <div className="mb-8 h-1 w-12 rounded-full bg-gold" />
            <p className="text-xs font-bold uppercase tracking-[.24em] text-gold">One place for your team</p>
            <h2 className="mt-4 max-w-sm text-3xl font-bold leading-tight sm:text-4xl">Hospitality, running smoothly.</h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-blue-100/85">
              Reservations, rooms, payments and daily operations, all in one place.
            </p>
          </div>

          <div className="relative mt-8 flex items-center gap-3 text-xs text-blue-100/75">
            <span className="h-px w-8 bg-gold/80" />
            Secure access for hotel staff
          </div>
        </aside>
      </div>
    </main>
  );
}
