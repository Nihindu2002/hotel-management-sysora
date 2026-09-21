import { useEffect, useState } from 'react';
import {
  AccountEmpty,
  AccountError,
  AccountHeading,
  AccountLoading,
  OUTLINE_BUTTON,
} from '../../../components/site/AccountPage';
import SiteLink from '../../../components/site/SiteLink';
import StatusPill from '../../../components/site/StatusPill';
import { getMyPayments } from '../../../services/paymentService';
import type { Payment } from '../../../types/payment';
import { formatDateTime, formatMoney } from '../../../utils/siteFormat';

export default function AccountPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    getMyPayments()
      .then((data) => {
        if (!ignore) setPayments(data ?? []);
      })
      .catch((err: any) => {
        if (!ignore) {
          setError(err?.response?.data?.message || 'We could not load your payment history.');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  if (loading) return <AccountLoading label="Loading your payments…" />;

  return (
    <div className="space-y-12">
      <AccountHeading
        eyebrow="Billing"
        title="Payments"
        description="Everything you have paid towards your stays, and any refunds."
        action={
          <SiteLink to="/account/invoices" className={OUTLINE_BUTTON}>
            View invoices
          </SiteLink>
        }
      />

      {error && <AccountError>{error}</AccountError>}

      {payments.length === 0 && !error ? (
        <AccountEmpty title="No payments yet" hint="Payments you make will be listed here." />
      ) : (
        <ul>
          {payments.map((payment) => (
            <li key={payment.paymentId} className="border-b border-line py-6 first:border-t">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-lg font-semibold tracking-[-0.01em]">
                    {formatMoney(payment.amount)}
                  </p>

                  <p className="mt-2 text-sm text-muted">
                    {formatDateTime(payment.createdAt)}
                    {payment.paymentMethod && (
                      <>
                        <span className="mx-2 text-muted" aria-hidden="true">
                          ·
                        </span>
                        {payment.paymentMethod}
                      </>
                    )}
                  </p>

                  <SiteLink
                    to={`/account/invoices/${payment.invoiceId}`}
                    className="mt-1.5 block font-mono text-[11px] break-all text-muted transition-colors duration-300 hover:text-gold-ink"
                  >
                    {payment.invoiceId}
                  </SiteLink>
                </div>

                <StatusPill status={payment.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
