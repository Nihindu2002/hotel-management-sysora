import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AccountError,
  AccountHeading,
  AccountLoading,
  FIELD_INPUT,
  FIELD_LABEL,
  OUTLINE_BUTTON,
} from '../../../components/site/AccountPage';
import SiteLink from '../../../components/site/SiteLink';
import StatusPill from '../../../components/site/StatusPill';
import { getInvoiceById } from '../../../services/invoiceService';
import { createPayment } from '../../../services/paymentService';
import type { Invoice } from '../../../types/invoice';
import type { Payment, PaymentMethod } from '../../../types/payment';
import { formatMoney, invoicePaidAndRemaining } from '../../../utils/siteFormat';

const PAYMENT_METHODS: { id: PaymentMethod; label: string; hint: string }[] = [
  { id: 'CARD', label: 'Credit / Debit Card', hint: 'Visa, Mastercard, Amex' },
  { id: 'ONLINE', label: 'Online Payment', hint: 'Pay through the booking portal' },
  { id: 'BANK_TRANSFER', label: 'Bank Transfer', hint: 'Settle by direct transfer' },
  { id: 'CASH', label: 'Cash', hint: 'Pay at the front desk' },
];

export default function AccountPaymentNew() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const invoiceId = searchParams.get('invoiceId') || '';

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(Boolean(invoiceId));
  const [invoiceError, setInvoiceError] = useState(
    invoiceId ? '' : 'No invoice was selected. Please choose an invoice to pay.',
  );

  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CARD');

  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ amount?: string }>({});
  const [submitError, setSubmitError] = useState('');
  const [paymentResult, setPaymentResult] = useState<Payment | null>(null);

  useEffect(() => {
    if (!invoiceId) return;

    let ignore = false;

    getInvoiceById(invoiceId)
      .then((loaded) => {
        if (ignore) return;

        setInvoice(loaded);

        // Default the field to whatever is still owed.
        const { remaining } = invoicePaidAndRemaining(loaded);
        if (remaining > 0) setAmount(remaining.toFixed(2));
      })
      .catch((err: any) => {
        if (ignore) return;

        if (err?.response?.status === 403) {
          setInvoiceError('You are not authorised to view or pay this invoice.');
        } else if (err?.response?.status === 404) {
          setInvoiceError('We could not find that invoice.');
        } else {
          setInvoiceError(err?.response?.data?.message || 'We could not load that invoice.');
        }
      })
      .finally(() => {
        if (!ignore) setLoadingInvoice(false);
      });

    return () => {
      ignore = true;
    };
  }, [invoiceId]);

  const { paid: paidAmount, remaining } = invoice
    ? invoicePaidAndRemaining(invoice)
    : { paid: 0, remaining: 0 };

  const validate = (): boolean => {
    const errors: { amount?: string } = {};
    const trimmed = amount.trim();

    if (!trimmed) {
      errors.amount = 'Payment amount is required.';
    } else if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
      errors.amount = 'Enter a valid amount with at most 2 decimal places (e.g. 150.00).';
    } else {
      const parsed = parseFloat(trimmed);
      if (Number.isNaN(parsed) || parsed <= 0) {
        errors.amount = 'Payment amount must be greater than 0.';
      } else if (remaining > 0 && parsed > remaining + 0.001) {
        errors.amount = `Amount cannot exceed the remaining balance of ${formatMoney(remaining)}.`;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitting) return;

    setSubmitError('');

    if (!validate() || !invoice) return;

    setSubmitting(true);

    try {
      // Send only what the API needs — never the uid, status or finance record.
      const result = await createPayment({
        invoiceId: invoice.invoiceId,
        reservationId: invoice.reservationId,
        amount: parseFloat(amount.trim()),
        paymentMethod,
      });

      // Refresh the invoice so the displayed balance reflects the payment.
      try {
        setInvoice(await getInvoiceById(invoice.invoiceId));
      } catch {
        // Keep current state if the refresh fails.
      }

      setPaymentResult(result);
    } catch (err: any) {
      const serverMessage = err?.response?.data?.message || err?.response?.data?.error;

      if (err?.response?.status === 403) {
        setSubmitError('You are not authorised to pay this invoice.');
      } else if (err?.response?.status === 400) {
        setSubmitError(serverMessage || 'That payment request was rejected. Check the amount.');
      } else if (err?.code === 'ERR_NETWORK' || !err?.response) {
        setSubmitError('We cannot reach the hotel right now. Check your connection.');
      } else {
        setSubmitError(serverMessage || 'The payment did not go through. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  /** Clears the receipt so another payment can be made against the balance. */
  const handlePayRemaining = () => {
    setPaymentResult(null);
    if (remaining > 0) setAmount(remaining.toFixed(2));
  };

  if (loadingInvoice) return <AccountLoading label="Loading invoice…" />;

  // ── Receipt ──
  if (paymentResult) {
    const status = paymentResult.status || 'COMPLETED';

    const headline =
      status === 'COMPLETED'
        ? 'Payment received'
        : status === 'PENDING'
          ? 'Payment pending'
          : status === 'REFUNDED'
            ? 'Payment refunded'
            : 'Payment failed';

    const explanation =
      status === 'COMPLETED'
        ? 'Your payment has been credited to the invoice.'
        : status === 'PENDING'
          ? 'Your payment is awaiting confirmation from the hotel.'
          : status === 'REFUNDED'
            ? 'This payment has been refunded.'
            : 'We could not process this payment. Please try again or contact the front desk.';

    return (
      <div className="max-w-xl">
        <p className="text-[10px] tracking-[0.3em] text-gold-ink uppercase">Receipt</p>

        <div className="mt-6 flex items-start justify-between gap-6 border-b border-line pb-7">
          <h1 className="text-[clamp(1.6rem,4vw,2.4rem)] leading-[1.05] font-semibold tracking-[-0.015em] uppercase">
            {headline}
          </h1>
          <StatusPill status={status} />
        </div>

        <p className="mt-6 text-sm leading-[2] text-muted">{explanation}</p>

        <dl className="mt-8">
          {[
            { label: 'Amount', value: formatMoney(paymentResult.amount), strong: true },
            { label: 'Method', value: paymentResult.paymentMethod },
            { label: 'Payment ID', value: paymentResult.paymentId, mono: true },
            { label: 'Invoice ID', value: paymentResult.invoiceId, mono: true },
            { label: 'Paid to date', value: formatMoney(paidAmount) },
            { label: 'Still outstanding', value: formatMoney(remaining) },
          ].map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-6 border-b border-line py-4 first:border-t"
            >
              <dt className="text-sm text-muted">{row.label}</dt>
              <dd
                className={`text-right text-sm ${row.strong ? 'font-semibold' : ''} ${
                  row.mono ? 'font-mono text-[11px] break-all' : ''
                }`}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-9 flex flex-wrap items-center gap-4">
          {remaining > 0 && (
            <button type="button" onClick={handlePayRemaining} className={OUTLINE_BUTTON}>
              Pay remaining
            </button>
          )}

          <SiteLink to="/account/invoices" className={OUTLINE_BUTTON}>
            All invoices
          </SiteLink>
        </div>
      </div>
    );
  }

  // ── Nothing to pay against ──
  if (invoiceError || !invoice) {
    return (
      <div className="space-y-8">
        <AccountError>{invoiceError || 'We could not load that invoice.'}</AccountError>
        <SiteLink to="/account/invoices" className={OUTLINE_BUTTON}>
          Back to invoices
        </SiteLink>
      </div>
    );
  }

  const isSettled = remaining <= 0;

  return (
    <div className="space-y-12">
      <AccountHeading
        eyebrow="Billing"
        title="Make a payment"
        description={`Paying invoice ${invoice.invoiceId}.`}
        action={<StatusPill status={invoice.status} />}
      />

      {submitError && <AccountError>{submitError}</AccountError>}

      {/* Invoice summary */}
      <dl className="grid gap-px border border-line bg-line sm:grid-cols-3">
        {[
          { label: 'Invoice total', value: formatMoney(invoice.totalAmount) },
          { label: 'Paid so far', value: formatMoney(paidAmount) },
          { label: 'Outstanding', value: formatMoney(remaining), accent: remaining > 0 },
        ].map((item) => (
          <div key={item.label} className="bg-surface p-6">
            <dt className="text-[10px] tracking-[0.24em] text-muted uppercase">
              {item.label}
            </dt>
            <dd
              className={`mt-3 text-xl font-semibold tracking-[-0.02em] ${
                item.accent ? 'text-danger-ink' : ''
              }`}
            >
              {item.value}
            </dd>
          </div>
        ))}
      </dl>

      {isSettled ? (
        <div className="border border-dashed border-line px-6 py-16 text-center">
          <p className="text-sm tracking-[0.18em] text-muted uppercase">
            This invoice is settled
          </p>
          <p className="mt-3 text-sm text-muted">There is nothing left to pay.</p>
          <SiteLink to="/account/invoices" className={`mt-8 ${OUTLINE_BUTTON}`}>
            Back to invoices
          </SiteLink>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="max-w-xl space-y-9">
          <div>
            <label htmlFor="amount" className={FIELD_LABEL}>
              Amount to pay
            </label>
            <input
              id="amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-invalid={Boolean(formErrors.amount)}
              className={`${FIELD_INPUT} text-lg ${formErrors.amount ? 'border-danger' : ''}`}
            />
            {formErrors.amount ? (
              <p className="mt-1.5 text-xs text-danger-ink">{formErrors.amount}</p>
            ) : (
              <p className="mt-1.5 text-xs text-muted">
                Up to {formatMoney(remaining)} outstanding.
              </p>
            )}
          </div>

          <fieldset>
            <legend className={FIELD_LABEL}>Payment method</legend>

            <div className="mt-4 grid gap-px border border-line bg-line sm:grid-cols-2">
              {PAYMENT_METHODS.map((method) => {
                const selected = paymentMethod === method.id;

                return (
                  <label
                    key={method.id}
                    className={`cursor-pointer bg-surface p-4 transition-colors duration-300 ${
                      selected ? 'bg-royal/10' : 'hover:bg-line/25'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.id}
                      checked={selected}
                      onChange={() => setPaymentMethod(method.id)}
                      className="sr-only"
                    />
                    <span className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                          selected ? 'border-royal' : 'border-line'
                        }`}
                      >
                        {selected && <span className="h-1.5 w-1.5 rounded-full bg-navy" />}
                      </span>
                      <span>
                        <span className="block text-[11px] tracking-[0.16em] uppercase">
                          {method.label}
                        </span>
                        <span className="mt-1 block text-xs text-muted">{method.hint}</span>
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center gap-4 border-t border-line pt-8">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-navy px-9 py-3.5 text-[11px] tracking-[0.28em] text-white uppercase transition-colors duration-500 hover:bg-royal disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Processing…' : `Pay ${formatMoney(parseFloat(amount) || 0)}`}
            </button>

            <button
              type="button"
              onClick={() => navigate('/account/invoices')}
              className={OUTLINE_BUTTON}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
