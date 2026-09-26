import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getInvoiceById } from '../../services/invoiceService';
import { getPaymentsByInvoice } from '../../services/paymentService';
import type { Invoice } from '../../types/invoice';
import type { Payment } from '../../types/payment';

function formatMoney(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

/**
 * One invoice, showing the same breakdown the desk reviewed at checkout — which
 * is the point of storing the charge lines rather than a single total.
 */
export default function InvoiceDetails() {
  const { invoiceId = '' } = useParams<{ invoiceId: string }>();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        const loaded = await getInvoiceById(invoiceId);
        if (ignore) return;
        setInvoice(loaded);

        const ledger = await getPaymentsByInvoice(invoiceId).catch(() => []);
        if (!ignore) setPayments(ledger);
      } catch (err: any) {
        if (!ignore) {
          setError(err?.response?.data?.message || 'Could not load this invoice.');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        Loading…
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {error ?? 'Invoice not found.'}
        </div>
        <Link to="/invoices" className="text-sm font-medium text-royal hover:underline">
          ← Back to invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link to="/invoices" className="text-sm font-medium text-royal hover:underline">
            ← Back to invoices
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
            Invoice
          </h1>
          <p className="mt-1 font-mono text-xs text-gray-500">{invoice.invoiceId}</p>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800">
          {invoice.status.replace('_', ' ')}
        </span>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
        <div className="grid gap-y-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between sm:pr-6">
            <span className="text-gray-600">Guest</span>
            <span className="font-medium text-gray-900">
              {invoice.customerName ?? '—'}
            </span>
          </div>
          <div className="flex justify-between sm:pl-6">
            <span className="text-gray-600">Room</span>
            <span className="font-medium text-gray-900">
              {invoice.roomNumber ?? '—'}
            </span>
          </div>
          <div className="flex justify-between sm:pr-6">
            <span className="text-gray-600">Check-in</span>
            <span className="text-gray-900">{formatDate(invoice.checkInDate)}</span>
          </div>
          <div className="flex justify-between sm:pl-6">
            <span className="text-gray-600">Check-out</span>
            <span className="text-gray-900">{formatDate(invoice.checkOutDate)}</span>
          </div>
          <div className="flex justify-between sm:pr-6">
            <span className="text-gray-600">Reservation</span>
            <Link
              to={`/staff/reservations/${invoice.reservationId}`}
              className="font-mono text-xs text-royal hover:underline"
            >
              {invoice.reservationId}
            </Link>
          </div>
          <div className="flex justify-between sm:pl-6">
            <span className="text-gray-600">Nights</span>
            <span className="text-gray-900">{invoice.nights ?? '—'}</span>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="border-b border-gray-200 pb-3 text-center text-lg font-bold tracking-widest text-gray-900">
          BILL
        </h2>

        <div className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Room charge</span>
            <span className="font-medium text-gray-900">
              {formatMoney(invoice.roomCharge)}
            </span>
          </div>

          {invoice.additionalCharges?.length > 0 && (
            <div className="space-y-1 border-t border-gray-100 pt-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Additional charges
              </div>
              {invoice.additionalCharges.map((charge, index) => (
                <div key={index} className="flex justify-between pl-2">
                  <span className="text-gray-600">{charge.description}</span>
                  <span className="text-gray-900">{formatMoney(charge.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between pl-2 font-medium">
                <span className="text-gray-600">Additional total</span>
                <span className="text-gray-900">
                  {formatMoney(invoice.additionalChargesTotal)}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-between border-t border-gray-100 pt-3 font-medium">
            <span className="text-gray-600">Subtotal</span>
            <span className="text-gray-900">{formatMoney(invoice.subtotal)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">
              Discount
              {invoice.discountType === 'PERCENTAGE' && invoice.discountValue
                ? ` (${invoice.discountValue}%)`
                : ''}
            </span>
            <span className="text-gray-900">
              −{formatMoney(invoice.discountAmount)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">
              Tax{invoice.taxRate ? ` (${invoice.taxRate}%)` : ''}
            </span>
            <span className="text-gray-900">{formatMoney(invoice.taxAmount)}</span>
          </div>

          <div className="flex justify-between border-y-2 border-gray-900 py-3 text-base font-bold">
            <span>TOTAL</span>
            <span>{formatMoney(invoice.totalAmount)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Amount paid</span>
            <span className="text-gray-900">{formatMoney(invoice.paidAmount)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span className="text-gray-600">Remaining balance</span>
            <span
              className={
                (invoice.remainingAmount ?? 0) > 0 ? 'text-red-600' : 'text-emerald-600'
              }
            >
              {formatMoney(invoice.remainingAmount)}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white shadow-xs">
        <h2 className="border-b border-gray-200 px-6 py-4 text-sm font-bold text-gray-900">
          Payments ({payments.length})
        </h2>

        {payments.length === 0 ? (
          <p className="px-6 py-4 text-sm text-gray-500">
            Nothing has been paid against this invoice yet.
          </p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Method</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.paymentId}>
                  <td className="px-6 py-3 text-gray-700">
                    {formatDate(payment.createdAt)}
                  </td>
                  <td className="px-6 py-3 text-gray-700">
                    {String(payment.paymentMethod).replace('_', ' ')}
                  </td>
                  <td className="px-6 py-3 text-right font-medium text-gray-900">
                    {formatMoney(payment.amount)}
                  </td>
                  <td className="px-6 py-3 text-center text-xs font-semibold text-gray-700">
                    {payment.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
