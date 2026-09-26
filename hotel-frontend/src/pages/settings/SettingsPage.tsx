import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';

interface Settings {
  taxPercentage: number;
}

/**
 * Property configuration, plus the signed-in user's own account.
 *
 * The values here are deployment settings served read-only by the backend —
 * changing them means changing the server's configuration, not this page.
 */
export default function SettingsPage() {
  const { user } = useAuth();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    api
      .get<Settings>('/settings')
      .then((response) => {
        if (!ignore) setSettings(response.data);
      })
      .catch((err: any) => {
        if (!ignore) {
          setError(
            err?.response?.data?.message || 'Could not load property settings.',
          );
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Settings
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          How this property is configured, and the account you are signed in
          with.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="text-lg font-bold text-gray-900">Billing</h2>
        <dl className="mt-4 divide-y divide-gray-100 text-sm">
          <div className="flex items-center justify-between py-3">
            <dt className="text-gray-600">Tax on final bill</dt>
            <dd className="font-medium text-gray-900">
              {loading ? '…' : `${settings?.taxPercentage ?? 0}%`}
            </dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-gray-600">Room charge basis</dt>
            <dd className="text-gray-900">Nights × room rate per night</dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-gray-600">Tax applied to</dt>
            <dd className="text-gray-900">Subtotal after discount</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-gray-500">
          These are server settings. Changing them is a deployment change, not
          something this screen can do.
        </p>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="text-lg font-bold text-gray-900">Your account</h2>
        <dl className="mt-4 divide-y divide-gray-100 text-sm">
          <div className="flex items-center justify-between py-3">
            <dt className="text-gray-600">Name</dt>
            <dd className="font-medium text-gray-900">
              {user ? `${user.firstName} ${user.lastName}`.trim() : '—'}
            </dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-gray-600">Email</dt>
            <dd className="text-gray-900">{user?.email ?? '—'}</dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-gray-600">Role</dt>
            <dd className="text-gray-900">{user?.role ?? '—'}</dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-gray-600">Phone</dt>
            <dd className="text-gray-900">{user?.phone || '—'}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
