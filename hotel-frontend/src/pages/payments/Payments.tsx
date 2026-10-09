import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllPayments, refundPayment } from '../../services/paymentService';
import type { Payment } from '../../types/payment';
import { useAuth } from '../../context/AuthContext';

function formatMoney(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateTime(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

/**
 * The payment ledger.
 *
 * Recording a payment happens at checkout, against the bill being settled. This
 * page is the record of what was taken: how much, by which method, and by whom.
 */
export default function Payments() {
  const { user } = useAuth();
  const canRefund = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [refundingId, setRefundingId] = useState<string | null>(null);

  const load = () =>
    getAllPayments()
      .then(setPayments)
      .catch((err: any) => {
        setError(err?.response?.data?.message || 'Failed to load payments.');
      });

  useEffect(() => {
    let ignore = false;

    getAllPayments()
      .then((data) => {
        if (!ignore) setPayments(data);
      })
      .catch((err: any) => {
        if (!ignore) {
          setError(err?.response?.data?.message || 'Failed to load payments.');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const totals = useMemo(() => {
    const settled = payments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount, 0);
    const refunded = payments
      .filter((p) => p.status === 'REFUNDED')
      .reduce((sum, p) => sum + p.amount, 0);

    return { settled, refunded };
  }, [payments]);

  const filtered = useMemo(() => {
    if (!search.trim()) return payments;
    const query = search.toLowerCase();

    return payments.filter(
      (payment) =>
        payment.paymentId.toLowerCase().includes(query) ||
        payment.invoiceId.toLowerCase().includes(query) ||
        String(payment.paymentMethod).toLowerCase().includes(query),
    );
  }, [payments, search]);

  const handleRefund = async (paymentId: string) => {
    setError(null);
    setNotice(null);
    setRefundingId(paymentId);

    try {
      await refundPayment(paymentId);
      await load();
      setNotice('Payment refunded.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not refund this payment.');
    } finally {
      setRefundingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Payments
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Money taken at the desk. Each payment also writes a finance income
            entry.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm">
            <span className="text-gray-500">Collected: </span>
            <span className="font-bold text-emerald-700">
              {formatMoney(totals.settled)}
            </span>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm">
            <span className="text-gray-500">Refunded: </span>
            <span className="font-bold text-red-700">
              {formatMoney(totals.refunded)}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search payment, invoice, method…"
        className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-royal focus:ring-2 focus:ring-royal/20 focus:outline-hidden sm:w-80"
      />

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No payments recorded yet.
                  </td>
                </tr>
              ) : (
                filtered.map((payment) => (
                  <tr key={payment.paymentId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">
                      {formatDateTime(payment.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/invoices/${payment.invoiceId}`}
                        className="font-mono text-royal hover:underline"
                      >
                        {payment.invoiceId.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {String(payment.paymentMethod).replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatMoney(payment.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          payment.status === 'REFUNDED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canRefund && payment.status === 'COMPLETED' && (
                        <button
                          type="button"
                          onClick={() => handleRefund(payment.paymentId)}
                          disabled={refundingId === payment.paymentId}
                          className="rounded-md border border-red-300 bg-white px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {refundingId === payment.paymentId ? 'Refunding…' : 'Refund'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
