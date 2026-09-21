import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AccountEmpty,
  AccountError,
  AccountHeading,
  AccountLoading,
  OUTLINE_BUTTON,
} from '../../../components/site/AccountPage';
import SiteLink from '../../../components/site/SiteLink';
import StatusPill from '../../../components/site/StatusPill';
import { getInvoiceById } from '../../../services/invoiceService';
import { getPaymentsByInvoice } from '../../../services/paymentService';
import type { Invoice } from '../../../types/invoice';
import type { Payment } from '../../../types/payment';
import { formatDate, formatDateTime, formatMoney, invoicePaidAndRemaining } from '../../../utils/siteFormat';

export default function AccountInvoiceDetails() {
  const { invoiceId } = useParams<{ invoiceId: string }>();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!invoiceId) return;

    let ignore = false;

    Promise.all([
      getInvoiceById(invoiceId),
      // A failure to list payments should not hide the invoice itself.
      getPaymentsByInvoice(invoiceId).catch(() => [] as Payment[]),
    ])
      .then(([invoiceData, paymentsData]) => {
        if (!ignore) {
          setInvoice(invoiceData);
          setPayments(paymentsData ?? []);
        }
      })
      .catch((err: any) => {
        if (ignore) return;

        if (err?.response?.status === 403) {
          setError('You are not authorised to view this invoice.');
        } else if (err?.response?.status === 404) {
          setError('We could not find that invoice.');
        } else {
          setError(err?.response?.data?.message || 'We could not load this invoice.');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [invoiceId]);

  if (loading) return <AccountLoading label="Loading invoice…" />;

  if (error || !invoice) {
    return (
      <div className="space-y-8">
        <AccountError>{error || 'We could not find that invoice.'}</AccountError>
        <SiteLink to="/account/invoices" className={OUTLINE_BUTTON}>
          Back to invoices
        </SiteLink>
      </div>
    );
  }

  const { paid, remaining } = invoicePaidAndRemaining(invoice);
  const isPayable = remaining > 0 && invoice.status !== 'PAID';

  const lines = [
    { label: 'Room charge', value: formatMoney(invoice.roomCharge) },
    { label: 'Additional charges', value: formatMoney(invoice.additionalCharges) },
    { label: 'Discount', value: `−${formatMoney(invoice.discount)}`, accent: 'gold' as const },
    { label: 'Total', value: formatMoney(invoice.totalAmount), strong: true },
    { label: 'Paid', value: formatMoney(paid) },
    {
      label: 'Remaining',
      value: formatMoney(remaining),
      accent: remaining > 0 ? ('danger' as const) : undefined,
      strong: true,
    },
  ];

  return (
    <div className="space-y-12">
      <SiteLink
        to="/account/invoices"
        className="text-[11px] tracking-[0.22em] text-muted uppercase transition-colors duration-300 hover:text-ink"
      >
        ← All invoices
      </SiteLink>

      <AccountHeading
        eyebrow={`Raised ${formatDate(invoice.createdAt)}`}
        title={formatMoney(invoice.totalAmount)}
        description={`Invoice ${invoice.invoiceId}`}
        action={
          isPayable ? (
            <SiteLink
              to={`/account/payments/new?invoiceId=${invoice.invoiceId}`}
              className="inline-block rounded-full bg-navy px-7 py-3 text-[11px] tracking-[0.22em] text-white uppercase transition-colors duration-500 hover:bg-royal"
            >
              Pay {formatMoney(remaining)}
            </SiteLink>
          ) : (
            <StatusPill status={invoice.status} />
          )
        }
      />

      <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
        {/* Charge breakdown */}
        <section>
          <h2 className="text-[11px] tracking-[0.24em] text-muted uppercase">
            Charges
          </h2>

          <dl className="mt-4">
            {lines.map((line) => (
              <div
                key={line.label}
                className="flex items-baseline justify-between gap-6 border-b border-line py-4 first:border-t"
              >
                <dt className="text-sm text-muted">{line.label}</dt>
                <dd
                  className={`text-sm ${line.strong ? 'font-semibold' : ''} ${
                    line.accent === 'gold'
                      ? 'text-gold-ink'
                      : line.accent === 'danger'
                        ? 'text-danger-ink'
                        : ''
                  }`}
                >
                  {line.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 space-y-2 text-xs text-muted">
            <p>
              Invoice{' '}
              <span className="font-mono break-all text-muted">{invoice.invoiceId}</span>
            </p>
            <p>
              Reservation{' '}
              <SiteLink
                to={`/reservations/${invoice.reservationId}`}
                className="font-mono break-all text-muted transition-colors duration-300 hover:text-gold-ink"
              >
                {invoice.reservationId}
              </SiteLink>
            </p>
          </div>
        </section>

        {/* Payments against this invoice */}
        <section>
          <h2 className="text-[11px] tracking-[0.24em] text-muted uppercase">
            Payments
          </h2>

          <div className="mt-4">
            {payments.length === 0 ? (
              <AccountEmpty title="No payments yet" hint="Nothing has been paid against this invoice." />
            ) : (
              <ul>
                {payments.map((payment) => (
                  <li
                    key={payment.paymentId}
                    className="flex items-center justify-between gap-4 border-b border-line py-4 first:border-t"
                  >
                    <div>
                      <p className="text-sm font-semibold">{formatMoney(payment.amount)}</p>
                      <p className="mt-1 text-xs text-muted">
                        {formatDateTime(payment.createdAt)} · {payment.paymentMethod}
                      </p>
                    </div>
                    <StatusPill status={payment.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
