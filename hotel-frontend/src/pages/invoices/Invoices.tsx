import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllInvoices } from '../../services/invoiceService';
import type { Invoice, InvoiceStatus } from '../../types/invoice';

function formatMoney(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const styles: Record<InvoiceStatus, string> = {
    UNPAID: 'bg-red-100 text-red-800',
    PARTIALLY_PAID: 'bg-amber-100 text-amber-800',
    PAID: 'bg-emerald-100 text-emerald-800',
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        styles[status] ?? 'bg-gray-100 text-gray-700'
      }`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

const TABS: Array<{ id: 'ALL' | InvoiceStatus; label: string }> = [
  { id: 'ALL', label: 'All' },
  { id: 'UNPAID', label: 'Unpaid' },
  { id: 'PARTIALLY_PAID', label: 'Partially paid' },
  { id: 'PAID', label: 'Paid' },
];

/** Every bill in the hotel, with what has been settled against it. */
export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'ALL' | InvoiceStatus>('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let ignore = false;

    getAllInvoices()
      .then((data) => {
        if (!ignore) setInvoices(data);
      })
      .catch((err: any) => {
        if (!ignore) {
          setError(err?.response?.data?.message || 'Failed to load invoices.');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const outstandingTotal = useMemo(
    () => invoices.reduce((sum, inv) => sum + (inv.remainingAmount ?? 0), 0),
    [invoices],
  );

  const filtered = useMemo(() => {
    return invoices.filter((invoice) => {
      if (tab !== 'ALL' && invoice.status !== tab) return false;
      if (!search.trim()) return true;

      const query = search.toLowerCase();
      return (
        invoice.invoiceId.toLowerCase().includes(query) ||
        (invoice.customerName ?? '').toLowerCase().includes(query) ||
        (invoice.roomNumber ?? '').toLowerCase().includes(query)
      );
    });
  }, [invoices, tab, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Invoices
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Bills raised against stays, and what is still owed on them.
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm">
          <span className="text-gray-500">Outstanding: </span>
          <span className="font-bold text-gray-900">
            {formatMoney(outstandingTotal)}
          </span>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-2">
          {TABS.map((item) => {
            const count =
              item.id === 'ALL'
                ? invoices.length
                : invoices.filter((inv) => inv.status === item.id).length;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  tab === item.id
                    ? 'bg-royal text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`rounded-full px-1.5 text-[10px] ${
                    tab === item.id ? 'bg-white/20' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search invoice, guest, room…"
          className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-royal focus:ring-2 focus:ring-royal/20 focus:outline-hidden sm:w-72"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Guest</th>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Remaining</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    No invoices match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((invoice) => (
                  <tr key={invoice.invoiceId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-gray-900">
                      <Link
                        to={`/invoices/${invoice.invoiceId}`}
                        className="font-semibold text-royal hover:underline"
                      >
                        {invoice.invoiceId.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-800">
                      {invoice.customerName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-800">
                      {invoice.roomNumber ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatMoney(invoice.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatMoney(invoice.paidAmount)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatMoney(invoice.remainingAmount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/invoices/${invoice.invoiceId}`}
                        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                      >
                        View
                      </Link>
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
