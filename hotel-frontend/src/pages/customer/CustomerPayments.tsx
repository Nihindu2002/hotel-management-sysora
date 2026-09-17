import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyPayments } from '../../services/paymentService';
import type { Payment } from '../../types/payment';

export default function CustomerPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    getMyPayments()
      .then((data) => {
        if (!ignore) setPayments(data);
      })
      .catch((err: any) => {
        if (!ignore) {
          setError(
            err?.response?.data?.message ||
              'Unable to load your payment history. Please try again later.'
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
      case 'COMPLETED':
        return (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            Completed
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
            Refunded
          </span>
        );
      case 'PENDING':
        return (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            Pending
          </span>
        );
      case 'FAILED':
      default:
        return (
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
            Failed
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
          <p className="text-sm text-gray-600">
            Track all transactions, payments, and refunds associated with your stays.
          </p>
        </div>
        <Link
          to="/customer/invoices"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← View My Invoices
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
          Loading payment history...
        </div>
      ) : payments.length === 0 ? (
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
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>
          <h3 className="mt-3 text-lg font-semibold text-gray-900">No Payments Recorded</h3>
          <p className="mt-1 text-sm text-gray-500">
            You have not made any payments yet.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">Payment ID</th>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Payment Method</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {payments.map((p) => (
                  <tr key={p.paymentId} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-mono text-xs text-gray-900 break-all">
                      {p.paymentId}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/customer/invoices/${p.invoiceId}`}
                        className="font-mono text-xs text-indigo-600 hover:text-indigo-900 break-all"
                      >
                        {p.invoiceId}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      ${(p.amount ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {renderStatusBadge(p.status)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
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
        </div>
      )}
    </div>
  );
}

