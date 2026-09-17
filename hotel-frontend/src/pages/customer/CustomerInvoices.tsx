import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyInvoices } from '../../services/invoiceService';
import type { Invoice } from '../../types/invoice';

export default function CustomerInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    getMyInvoices()
      .then((data) => {
        if (!ignore) setInvoices(data);
      })
      .catch((err: any) => {
        if (!ignore) {
          setError(
            err?.response?.data?.message ||
              'Unable to load your invoices. Please try again later.'
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

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            Paid
          </span>
        );
      case 'PARTIALLY_PAID':
        return (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            Partially Paid
          </span>
        );
      case 'UNPAID':
      default:
        return (
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
            Unpaid
          </span>
        );
    }
  };

  const computePaidAndRemaining = (invoice: Invoice) => {
    const total = invoice.totalAmount ?? 0;
    const paid =
      invoice.paidAmount !== undefined
        ? invoice.paidAmount
        : invoice.status === 'PAID'
        ? total
        : 0;
    const remaining =
      invoice.remainingAmount !== undefined
        ? invoice.remainingAmount
        : Math.max(0, total - paid);

    return { paid, remaining };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Invoices</h1>
          <p className="text-sm text-gray-600">
            Review your room charges, payments, and outstanding balances.
          </p>
        </div>
        <Link
          to="/customer/payments"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          View Payment History →
        </Link>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500">
          Loading your invoices...
        </div>
      ) : invoices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-xs">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-3 text-lg font-semibold text-gray-900">No Invoices Found</h3>
          <p className="mt-1 text-sm text-gray-500">
            You do not have any invoices at this time.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">Invoice ID</th>
                  <th className="px-4 py-3">Reservation / Room</th>
                  <th className="px-4 py-3 text-right">Room Charge</th>
                  <th className="px-4 py-3 text-right">Addl. Charges</th>
                  <th className="px-4 py-3 text-right">Discount</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Remaining</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {invoices.map((inv) => {
                  const { paid, remaining } = computePaidAndRemaining(inv);
                  const isPayable = remaining > 0 && inv.status !== 'PAID';

                  return (
                    <tr key={inv.invoiceId} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium text-gray-900 break-all">
                        <Link
                          to={`/customer/invoices/${inv.invoiceId}`}
                          className="text-indigo-600 hover:text-indigo-900 font-mono text-xs"
                        >
                          {inv.invoiceId}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <div className="font-medium text-gray-900">Room: {inv.roomId}</div>
                        <div className="text-xs text-gray-500 font-mono break-all">
                          Res: {inv.reservationId}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-700">
                        ${(inv.roomCharge ?? 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        ${(inv.additionalCharges ?? 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600">
                        -${(inv.discount ?? 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">
                        ${(inv.totalAmount ?? 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-700 font-medium">
                        ${paid.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">
                        ${remaining.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {renderStatusBadge(inv.status)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            to={`/customer/invoices/${inv.invoiceId}`}
                            className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                          >
                            Details
                          </Link>
                          {isPayable && (
                            <Link
                              to={`/customer/payments/new?invoiceId=${inv.invoiceId}`}
                              className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                            >
                              Pay Now
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

