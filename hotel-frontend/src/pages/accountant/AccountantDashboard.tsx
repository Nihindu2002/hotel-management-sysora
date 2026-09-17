import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSummary as getFinanceSummary } from '../../services/financeService';
import { getInvoiceOutstanding } from '../../services/dashboardService';
import { getAllPayments } from '../../services/paymentService';
import { formatCurrency, formatDateTime } from '../dashboard/dashboardMeta';
import { currentMonthLabel, formatRangeLabel, thisMonthRange } from '../../utils/dateRange';
import type { FinanceSummary } from '../../types/finance';
import type { InvoiceOutstanding } from '../../types/dashboard';
import type { Payment } from '../../types/payment';

const EMPTY_SUMMARY: FinanceSummary = {
  totalIncome: 0,
  totalExpenses: 0,
  netIncome: 0,
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank Transfer',
  ONLINE: 'Online',
};

export default function AccountantDashboard() {
  const [summary, setSummary] = useState<FinanceSummary>(EMPTY_SUMMARY);
  const [monthSummary, setMonthSummary] = useState<FinanceSummary>(EMPTY_SUMMARY);
  const [outstanding, setOutstanding] = useState<InvoiceOutstanding | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const month = useMemo(() => thisMonthRange(), []);
  const monthLabel = useMemo(() => currentMonthLabel(), []);

  const loadData = useCallback(async () => {
    try {
      setError(null);

      // Revenue and expenses come from the same /api/finance/summary the
      // Finance dashboard reads, so the two pages can never disagree.
      const [allTime, thisMonth, outstandingData, paymentList] = await Promise.all([
        getFinanceSummary(),
        getFinanceSummary(month.startDate, month.endDate),
        getInvoiceOutstanding(),
        getAllPayments(),
      ]);

      setSummary(allTime);
      setMonthSummary(thisMonth);
      setOutstanding(outstandingData);
      setPayments(paymentList);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load your dashboard.');
    } finally {
      setLoading(false);
    }
  }, [month.startDate, month.endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const recentPayments = useMemo(
    () =>
      [...payments]
        .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
        .slice(0, 6),
    [payments]
  );

  const collectionRate =
    outstanding && outstanding.totalInvoiced > 0
      ? (outstanding.totalPaid / outstanding.totalInvoiced) * 100
      : 0;

  const cards = [
    {
      label: 'Total Revenue',
      value: formatCurrency(summary.totalIncome),
      hint: 'All recorded income',
      tone: 'text-emerald-600',
      chip: 'bg-emerald-50 text-emerald-600',
      icon: 'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941',
    },
    {
      label: 'Total Expenses',
      value: formatCurrency(summary.totalExpenses),
      hint: 'All recorded spending',
      tone: 'text-red-600',
      chip: 'bg-red-50 text-red-600',
      icon: 'M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181',
    },
    {
      label: 'Net Income',
      value: formatCurrency(summary.netIncome),
      hint: 'Revenue − expenses',
      tone: summary.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600',
      chip:
        summary.netIncome >= 0
          ? 'bg-emerald-50 text-emerald-600'
          : 'bg-red-50 text-red-600',
      icon: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
      label: 'Outstanding Invoices',
      value: formatCurrency(outstanding?.totalOutstanding ?? 0),
      hint: `${outstanding?.outstandingInvoices ?? 0} of ${
        outstanding?.totalInvoices ?? 0
      } invoices awaiting payment`,
      tone: 'text-amber-600',
      chip: 'bg-amber-50 text-amber-600',
      icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-6.75 4.5h16.5A2.25 2.25 0 0021.75 18.5V6.75A2.25 2.25 0 0019.5 4.5H4.5A2.25 2.25 0 002.25 6.75v11.75A2.25 2.25 0 004.5 21z',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accountant Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Revenue, expenses, receivables, and the latest payments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {loading && (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
          )}
          <Link
            to="/finance"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            Open Finance
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold uppercase tracking-wider ${card.tone}`}>
                {card.label}
              </span>
              <span className={`rounded-full p-2 ${card.chip}`}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={card.icon} />
                </svg>
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="mt-1 text-xs text-gray-500">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Month to date */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">{monthLabel}</h2>
          <p className="mb-4 text-xs text-gray-500">Month to date</p>

          <dl className="space-y-3">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-gray-600">Revenue</dt>
              <dd className="text-sm font-semibold text-emerald-700">
                {formatCurrency(monthSummary.totalIncome)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-gray-600">Expenses</dt>
              <dd className="text-sm font-semibold text-red-700">
                {formatCurrency(monthSummary.totalExpenses)}
              </dd>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <dt className="text-sm font-medium text-gray-800">Net</dt>
              <dd
                className={`text-sm font-bold ${
                  monthSummary.netIncome >= 0 ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {formatCurrency(monthSummary.netIncome)}
              </dd>
            </div>
          </dl>
        </div>

        {/* Receivables */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Receivables</h2>
              <p className="text-xs text-gray-500">Invoice position across the property</p>
            </div>
            <Link
              to="/invoices"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              View invoices →
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500">Loading…</div>
          ) : !outstanding || outstanding.totalInvoices === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">No invoices raised yet.</div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-gray-50 px-4 py-3">
                  <p className="text-xs text-gray-500">Total invoiced</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(outstanding.totalInvoiced)}
                  </p>
                </div>
                <div className="rounded-lg bg-emerald-50 px-4 py-3">
                  <p className="text-xs text-emerald-700">Collected</p>
                  <p className="text-lg font-bold text-emerald-800">
                    {formatCurrency(outstanding.totalPaid)}
                  </p>
                </div>
                <div className="rounded-lg bg-amber-50 px-4 py-3">
                  <p className="text-xs text-amber-700">Outstanding</p>
                  <p className="text-lg font-bold text-amber-800">
                    {formatCurrency(outstanding.totalOutstanding)}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Collection rate</span>
                  <span className="font-semibold text-gray-900">
                    {collectionRate.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${Math.min(collectionRate, 100)}%` }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recent payments */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Recent Payments</h2>
            <p className="text-xs text-gray-500">Latest transactions received</p>
          </div>
          <Link to="/payments" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-gray-500">Loading payments…</div>
        ) : recentPayments.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            No payments recorded yet.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recentPayments.map((payment) => (
              <li
                key={payment.paymentId}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    Invoice {payment.invoiceId.slice(0, 8)}…
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {PAYMENT_METHOD_LABEL[payment.paymentMethod] ?? payment.paymentMethod} ·{' '}
                    {formatDateTime(payment.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                    {payment.status}
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {formatCurrency(payment.amount)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Revenue and expense figures shown for {formatRangeLabel(month)} and all time.
      </p>
    </div>
  );
}
