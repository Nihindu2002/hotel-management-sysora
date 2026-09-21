import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { profileRules, type ProfileFormValues } from '../../../schemas/profileSchemas';
import { updateProfile } from '../../../services/userService';
import { formatDate } from '../../../utils/siteFormat';

export default function AccountProfile() {
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

      // Keep the site header and any other consumer of auth state in step.
      await refreshProfile();

      reset({
        firstName: updated.firstName ?? '',
        lastName: updated.lastName ?? '',
        phone: updated.phone ?? '',
      });

      setSuccess('Your details have been saved.');
    } catch (err: any) {
      setApiError(err?.response?.data?.message || err?.message || 'We could not save your details.');
    }
  };

  if (!user) return null;

  const readOnlyFields = [
    { label: 'Email', value: user.email, note: 'Cannot be changed here' },
    { label: 'Member since', value: formatDate(user.createdAt) },
  ];

  return (
    <div className="space-y-12">
      <AccountHeading
        eyebrow="Your details"
        title="Profile"
        description="Keep your contact information up to date so we can reach you about your stay."
        action={
          <SiteLink to="/account/settings" className={OUTLINE_BUTTON}>
            Account settings
          </SiteLink>
        }
      />

      {apiError && <AccountError>{apiError}</AccountError>}
      {success && <AccountSuccess>{success}</AccountSuccess>}

      <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
        <section>
          <h2 className="text-[11px] tracking-[0.24em] text-muted uppercase">
            Personal information
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-7">
            <div className="grid gap-7 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className={FIELD_LABEL}>
                  First name
                </label>
                <input
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  className={`${FIELD_INPUT} ${errors.firstName ? 'border-danger' : ''}`}
                  {...register('firstName', profileRules.firstName)}
                />
                {errors.firstName && (
                  <p className="mt-1.5 text-xs text-danger-ink">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className={FIELD_LABEL}>
                  Last name
                </label>
                <input
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  className={`${FIELD_INPUT} ${errors.lastName ? 'border-danger' : ''}`}
                  {...register('lastName', profileRules.lastName)}
                />
                {errors.lastName && (
                  <p className="mt-1.5 text-xs text-danger-ink">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="sm:max-w-xs">
              <label htmlFor="phone" className={FIELD_LABEL}>
                Phone
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="0771234567"
                className={`${FIELD_INPUT} ${errors.phone ? 'border-danger' : ''}`}
                {...register('phone', profileRules.phone)}
              />
              {errors.phone ? (
                <p className="mt-1.5 text-xs text-danger-ink">{errors.phone.message}</p>
              ) : (
                <p className="mt-1.5 text-xs text-muted">Optional</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 border-t border-line pt-7">
              <button type="submit" disabled={isSubmitting} className={SOLID_BUTTON}>
                {isSubmitting ? 'Saving…' : 'Save changes'}
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
                className={`${OUTLINE_BUTTON} disabled:cursor-not-allowed disabled:opacity-40`}
              >
                Reset
              </button>
            </div>
          </form>
        </section>

        <section>
          <h2 className="text-[11px] tracking-[0.24em] text-muted uppercase">
            Held by the hotel
          </h2>

          <dl className="mt-6">
            {readOnlyFields.map((field) => (
              <div key={field.label} className="border-b border-line py-4 first:border-t">
                <dt className="text-[10px] tracking-[0.24em] text-muted uppercase">
                  {field.label}
                </dt>
                <dd className="mt-2 text-sm break-words">{field.value}</dd>
                {field.note && <p className="mt-1 text-xs text-muted">{field.note}</p>}
              </div>
            ))}
          </dl>

          <p className="mt-6 text-xs leading-relaxed text-muted">
            Your email address identifies your account and cannot be changed here. Contact the front
            desk if it needs to be updated.
          </p>
        </section>
      </div>
    </div>
  );
}
