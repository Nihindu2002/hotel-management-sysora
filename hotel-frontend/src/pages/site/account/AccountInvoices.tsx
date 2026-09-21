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
import { getMyInvoices } from '../../../services/invoiceService';
import type { Invoice } from '../../../types/invoice';
import { formatDate, formatMoney, invoicePaidAndRemaining } from '../../../utils/siteFormat';

export default function AccountInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    getMyInvoices()
      .then((data) => {
        if (!ignore) setInvoices(data ?? []);
      })
      .catch((err: any) => {
        if (!ignore) {
          setError(err?.response?.data?.message || 'We could not load your invoices.');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  if (loading) return <AccountLoading label="Loading your invoices…" />;

  const outstanding = invoices.reduce(
    (sum, invoice) => sum + invoicePaidAndRemaining(invoice).remaining,
    0,
  );

  return (
    <div className="space-y-12">
      <AccountHeading
        eyebrow="Billing"
        title="Invoices"
        description="Room charges, extras and any balance still to settle."
        action={
          <SiteLink to="/account/payments" className={OUTLINE_BUTTON}>
            Payment history
          </SiteLink>
        }
      />

      {error && <AccountError>{error}</AccountError>}

      {invoices.length === 0 && !error ? (
        <AccountEmpty
          title="No invoices yet"
          hint="An invoice is raised once the hotel confirms a booking."
        />
      ) : (
        <>
          {outstanding > 0 && (
            <p className="text-sm text-muted">
              Outstanding across all invoices:{' '}
              <span className="font-semibold text-danger-ink">{formatMoney(outstanding)}</span>
            </p>
          )}

          <ul>
            {invoices.map((invoice) => {
              const { paid, remaining } = invoicePaidAndRemaining(invoice);
              const isPayable = remaining > 0 && invoice.status !== 'PAID';

              return (
                <li key={invoice.invoiceId} className="border-b border-line py-7 first:border-t">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-lg font-semibold tracking-[-0.01em] uppercase">
                        {formatMoney(invoice.totalAmount)}
                      </p>

                      <p className="mt-2 text-sm text-muted">
                        Raised {formatDate(invoice.createdAt)}
                      </p>

                      <p className="mt-1.5 font-mono text-[11px] break-all text-muted">
                        {invoice.invoiceId}
                      </p>

                      {/* Charge breakdown */}
                      <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-xs">
                        <div className="flex gap-2">
                          <dt className="text-muted">Room</dt>
                          <dd>{formatMoney(invoice.roomCharge)}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="text-muted">Extras</dt>
                          <dd>{formatMoney(invoice.additionalCharges)}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="text-muted">Discount</dt>
                          <dd className="text-gold-ink">−{formatMoney(invoice.discount)}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="text-muted">Paid</dt>
                          <dd>{formatMoney(paid)}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="text-muted">Remaining</dt>
                          <dd className={remaining > 0 ? 'text-danger-ink' : ''}>
                            {formatMoney(remaining)}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-4">
                      <StatusPill status={invoice.status} />

                      <SiteLink
                        to={`/account/invoices/${invoice.invoiceId}`}
                        className="text-[11px] tracking-[0.2em] text-muted uppercase transition-colors duration-300 hover:text-ink"
                      >
                        Details
                      </SiteLink>

                      {isPayable && (
                        <SiteLink
                          to={`/account/payments/new?invoiceId=${invoice.invoiceId}`}
                          className="rounded-full bg-navy px-6 py-2.5 text-[10px] tracking-[0.2em] text-white uppercase transition-colors duration-500 hover:bg-royal"
                        >
                          Pay now
                        </SiteLink>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
