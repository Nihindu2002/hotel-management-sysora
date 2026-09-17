import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getInvoiceById } from '../../services/invoiceService';
import { getPaymentsByInvoice } from '../../services/paymentService';
import type { Invoice } from '../../types/invoice';
import type { Payment } from '../../types/payment';

export default function CustomerInvoiceDetails() {
  const { invoiceId } = useParams<{ invoiceId: string }>();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceId) return;

    let ignore = false;

    Promise.all([
      getInvoiceById(invoiceId),
      getPaymentsByInvoice(invoiceId).catch(() => [] as Payment[]),
    ])
      .then(([invData, paymentsData]) => {
        if (!ignore) {
          setInvoice(invData);
          setPayments(paymentsData);
        }
      })
      .catch((err: any) => {
        if (!ignore) {
          if (err?.response?.status === 403) {
            setError('You are not authorized to view this invoice.');
          } else if (err?.response?.status === 404) {
            setError('Invoice not found.');
          } else {
            setError(
              err?.response?.data?.message ||
                'Unable to load invoice details. Please try again later.'
            );
          }
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500">
        Loading invoice details...
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="space-y-4">
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800"
        >
          {error || 'Invoice not found.'}
        </div>
        <Link
          to="/customer/invoices"
          className="inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Back to My Invoices
        </Link>
      </div>
    );
  }

  // Calculate paid and remaining balance
  const totalAmount = invoice.totalAmount ?? 0;
  const totalPaid =
    invoice.paidAmount !== undefined
      ? invoice.paidAmount
      : payments
          .filter((p) => p.status === 'COMPLETED')
          .reduce((sum, p) => sum + (p.amount ?? 0), 0);

  const remainingBalance =
    invoice.remainingAmount !== undefined
      ? invoice.remainingAmount
      : Math.max(0, totalAmount - totalPaid);

  const isPayable = remainingBalance > 0 && invoice.status !== 'PAID';

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            PAID
          </span>
        );
      case 'PARTIALLY_PAID':
        return (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            PARTIALLY PAID
          </span>
        );
      case 'UNPAID':
      default:
        return (
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">
            UNPAID
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              Invoice #{invoice.invoiceId}
            </h1>
            {renderStatusBadge(invoice.status)}
          </div>
          <p className="mt-1 text-xs text-gray-500 font-mono">
            Reservation ID: {invoice.reservationId} · Room: {invoice.roomId}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/customer/invoices"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            ← Invoices
          </Link>
          {isPayable && (
            <Link
              to={`/customer/payments/new?invoiceId=${invoice.invoiceId}`}
              className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-xs transition"
            >
              Pay Now (${remainingBalance.toFixed(2)})
            </Link>
          )}
        </div>
      </div>

      {/* Invoice Breakdown */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Line Items Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2">
            Charges Breakdown
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between text-gray-600">
              <dt>Room Charge</dt>
              <dd className="font-medium text-gray-900">
                ${(invoice.roomCharge ?? 0).toFixed(2)}
              </dd>
            </div>
            <div className="flex justify-between text-gray-600">
              <dt>Additional Charges</dt>
              <dd className="font-medium text-gray-900">
                ${(invoice.additionalCharges ?? 0).toFixed(2)}
              </dd>
            </div>
            <div className="flex justify-between text-gray-600">
              <dt>Discount</dt>
              <dd className="font-medium text-emerald-600">
                -${(invoice.discount ?? 0).toFixed(2)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-3 text-base font-bold text-gray-900">
              <dt>Total Amount</dt>
              <dd>${totalAmount.toFixed(2)}</dd>
            </div>
          </dl>
        </div>

        {/* Payment Balance Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2">
              Balance Status
            </h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <dt>Total Billed</dt>
                <dd className="font-medium text-gray-900">${totalAmount.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between text-gray-600">
                <dt>Total Paid</dt>
                <dd className="font-semibold text-emerald-600">
                  ${totalPaid.toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-3 text-lg font-extrabold">
                <dt className="text-gray-900">Remaining Balance</dt>
                <dd className={remainingBalance > 0 ? 'text-red-600' : 'text-emerald-600'}>
                  ${remainingBalance.toFixed(2)}
                </dd>
              </div>
            </dl>
          </div>

          {isPayable && (
            <div className="pt-4 border-t border-gray-100">
              <Link
                to={`/customer/payments/new?invoiceId=${invoice.invoiceId}`}
                className="block w-full rounded-md bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-700 transition"
              >
                Pay Outstanding Balance (${remainingBalance.toFixed(2)})
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Payment History Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-gray-900">Payment History</h2>

        {payments.length === 0 ? (
          <p className="text-sm text-gray-500">
            No payments have been recorded for this invoice yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-2.5">Payment ID</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-4 py-2.5 text-center">Method</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                  <th className="px-4 py-2.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white font-mono text-xs">
                {payments.map((p) => (
                  <tr key={p.paymentId} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-800 break-all">{p.paymentId}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                      ${(p.amount ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-center font-sans">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center font-sans">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          p.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.status === 'REFUNDED'
                            ? 'bg-purple-100 text-purple-800'
                            : p.status === 'FAILED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 font-sans">
                      {p.createdAt
                        ? new Date(p.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
