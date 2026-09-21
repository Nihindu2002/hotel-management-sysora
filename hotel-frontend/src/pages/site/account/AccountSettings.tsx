import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import {
  AccountError,
  AccountHeading,
  AccountSuccess,
  FIELD_INPUT,
  FIELD_LABEL,
  OUTLINE_BUTTON,
  SOLID_BUTTON,
} from '../../../components/site/AccountPage';
import SiteLink from '../../../components/site/SiteLink';
import { useAuth } from '../../../hooks/useAuth';
import {
  firebasePasswordError,
  passwordRules,
  type PasswordFormValues,
} from '../../../schemas/profileSchemas';
import * as authService from '../../../services/authService';
import { formatDate, formatDateTime } from '../../../utils/siteFormat';

export default function AccountSettings() {
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
        firebasePasswordError(err?.code ?? '', err?.message ?? 'We could not change your password.'),
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

  const details = [
    { label: 'Email', value: user.email },
    { label: 'Member since', value: formatDate(user.createdAt) },
    {
      label: 'Last sign-in',
      value: firebaseUser?.metadata?.lastSignInTime
        ? formatDateTime(firebaseUser.metadata.lastSignInTime)
        : '—',
    },
  ];

  return (
    <div className="space-y-12">
      <AccountHeading
        eyebrow="Account"
        title="Settings"
        description="Sign-in credentials and access for this account."
        action={
          <SiteLink to="/account/profile" className={OUTLINE_BUTTON}>
            Edit profile
          </SiteLink>
        }
      />

      <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
        <section>
          <h2 className="text-[11px] tracking-[0.24em] text-muted uppercase">
            Change password
          </h2>

          <p className="mt-4 max-w-md text-sm leading-[1.9] text-muted">
            Handled by Firebase Authentication. Your current password is required to confirm the
            change.
          </p>

          {(passwordError || passwordSuccess) && (
            <div className="mt-6 space-y-3">
              {passwordError && <AccountError>{passwordError}</AccountError>}
              {passwordSuccess && <AccountSuccess>{passwordSuccess}</AccountSuccess>}
            </div>
          )}

          <form onSubmit={handleSubmit(onChangePassword)} noValidate className="mt-6 space-y-7">
            <div>
              <label htmlFor="currentPassword" className={FIELD_LABEL}>
                Current password
              </label>
              <input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                className={`${FIELD_INPUT} ${errors.currentPassword ? 'border-danger' : ''}`}
                {...register('currentPassword', passwordRules.currentPassword)}
              />
              {errors.currentPassword && (
                <p className="mt-1.5 text-xs text-danger-ink">{errors.currentPassword.message}</p>
              )}
            </div>

            <div className="grid gap-7 sm:grid-cols-2">
              <div>
                <label htmlFor="newPassword" className={FIELD_LABEL}>
                  New password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  className={`${FIELD_INPUT} ${errors.newPassword ? 'border-danger' : ''}`}
                  {...register('newPassword', passwordRules.newPassword)}
                />
                {errors.newPassword ? (
                  <p className="mt-1.5 text-xs text-danger-ink">{errors.newPassword.message}</p>
                ) : (
                  <p className="mt-1.5 text-xs text-muted">
                    At least 8 characters with upper, lower, number and symbol
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className={FIELD_LABEL}>
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  className={`${FIELD_INPUT} ${errors.confirmPassword ? 'border-danger' : ''}`}
                  {...register('confirmPassword', passwordRules.confirmPassword(getValues))}
                />
                {errors.confirmPassword && (
                  <p className="mt-1.5 text-xs text-danger-ink">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <div className="border-t border-line pt-7">
              <button type="submit" disabled={isSubmitting} className={SOLID_BUTTON}>
                {isSubmitting ? 'Updating…' : 'Update password'}
              </button>
            </div>
          </form>
        </section>

        <section>
          <h2 className="text-[11px] tracking-[0.24em] text-muted uppercase">
            Account
          </h2>

          <dl className="mt-6">
            {details.map((row) => (
              <div key={row.label} className="border-b border-line py-4 first:border-t">
                <dt className="text-[10px] tracking-[0.24em] text-muted uppercase">
                  {row.label}
                </dt>
                <dd className="mt-2 text-sm break-words">{row.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex items-start gap-3">
            <span
              aria-hidden="true"
              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                isEnabled ? 'bg-success' : 'bg-danger'
              }`}
            />
            <p className="text-xs leading-relaxed text-muted">
              <span className={isEnabled ? 'text-success-ink' : 'text-danger-ink'}>
                {isEnabled ? 'Active' : 'Disabled'}
              </span>{' '}
              —{' '}
              {isEnabled
                ? 'your account is in good standing and can sign in.'
                : 'sign-in is blocked. Contact the front desk for help.'}
            </p>
          </div>

          <div className="mt-10 border-t border-line pt-7">
            <h3 className="text-[11px] tracking-[0.24em] text-muted uppercase">Session</h3>
            <p className="mt-3 text-xs text-muted">
              End your session on this device. Any unsaved changes are lost.
            </p>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="mt-5 rounded-full border border-line px-7 py-3 text-[11px] tracking-[0.22em] text-ink uppercase transition-colors duration-500 hover:border-danger hover:text-danger-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loggingOut ? 'Signing out…' : 'Log out'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
