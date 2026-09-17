import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSummary, getTransactions } from '../../services/financeService';
import {
  STATUS_BADGE,
  TYPE_BADGE,
  categoryBar,
  categoryLabel,
  currentMonthLabel,
  currentMonthRange,
  formatCount,
  formatCurrency,
  formatDate,
  sortByNewest,
  summarizeByCategory,
} from './financeMeta';
import type {
  CategoryBreakdown,
  FinanceSummary,
  FinanceTransaction,
} from '../../types/finance';

const EMPTY_SUMMARY: FinanceSummary = {
  totalIncome: 0,
  totalExpenses: 0,
  netIncome: 0,
};

const percentOfTotal = (amount: number, total: number): string =>
  total > 0 ? `${((amount / total) * 100).toFixed(1)}%` : '—';

interface BreakdownCardProps {
  title: string;
  subtitle: string;
  rows: CategoryBreakdown[];
  total: number;
  loading: boolean;
  emptyMessage: string;
}

function BreakdownCard({
  title,
  subtitle,
  rows,
  total,
  loading,
  emptyMessage,
}: BreakdownCardProps) {
  const peak = rows.reduce((max, row) => Math.max(max, row.amount), 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-500">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">{emptyMessage}</div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.category}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium text-gray-800">
                  {categoryLabel(row.category)}
                </span>
                <span className="shrink-0 font-semibold text-gray-900">
                  {formatCurrency(row.amount)}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${categoryBar(row.category)}`}
                    style={{ width: peak > 0 ? `${(row.amount / peak) * 100}%` : '0%' }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right text-xs text-gray-500">
                  {percentOfTotal(row.amount, total)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function FinanceDashboard() {
  const [summary, setSummary] = useState<FinanceSummary>(EMPTY_SUMMARY);
  const [monthSummary, setMonthSummary] = useState<FinanceSummary>(EMPTY_SUMMARY);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const month = useMemo(() => currentMonthRange(), []);
  const monthLabel = useMemo(() => currentMonthLabel(), []);

  const loadData = useCallback(async () => {
    try {
      setError(null);

      // The category breakdowns are derived from the ledger rather than the
      // summary endpoint, which only returns three totals.
      const [allTime, thisMonth, ledger] = await Promise.all([
        getSummary(),
        getSummary(month.startDate, month.endDate),
        getTransactions(),
      ]);

      setSummary(allTime);
      setMonthSummary(thisMonth);
      setTransactions(ledger);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load the finance dashboard.');
    } finally {
      setLoading(false);
    }
  }, [month.startDate, month.endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const incomeBreakdown = useMemo(
    () => summarizeByCategory(transactions, 'INCOME'),
    [transactions]
  );

  const expenseBreakdown = useMemo(
    () => summarizeByCategory(transactions, 'EXPENSE'),
    [transactions]
  );

  const recent = useMemo(
    () => sortByNewest(transactions).slice(0, 6),
    [transactions]
  );

  const activeCount = useMemo(
    () => transactions.filter((t) => t.status === 'ACTIVE').length,
    [transactions]
  );

  const cancelledCount = transactions.length - activeCount;
  const netIsPositive = summary.netIncome >= 0;
  const monthNetIsPositive = monthSummary.netIncome >= 0;

  const cards = [
    {
      label: 'Total Income',
      value: formatCurrency(summary.totalIncome),
      hint: 'All recorded revenue',
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
      hint: 'Income − expenses',
      tone: netIsPositive ? 'text-emerald-600' : 'text-red-600',
      chip: netIsPositive
        ? 'bg-emerald-50 text-emerald-600'
        : 'bg-red-50 text-red-600',
      icon: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
      label: `${monthLabel} Income`,
      value: formatCurrency(monthSummary.totalIncome),
      hint: 'Month to date',
      tone: 'text-emerald-600',
      chip: 'bg-emerald-50 text-emerald-600',
      icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
    },
    {
      label: `${monthLabel} Expenses`,
      value: formatCurrency(monthSummary.totalExpenses),
      hint: 'Month to date',
      tone: 'text-red-600',
      chip: 'bg-red-50 text-red-600',
      icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
    },
    {
      label: `${monthLabel} Net`,
      value: formatCurrency(monthSummary.netIncome),
      hint: 'Month to date',
      tone: monthNetIsPositive ? 'text-emerald-600' : 'text-red-600',
      chip: monthNetIsPositive
        ? 'bg-emerald-50 text-emerald-600'
        : 'bg-red-50 text-red-600',
      icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Revenue and spending recorded automatically from payments, inventory,
            and maintenance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/finance/transactions?type=INCOME"
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 shadow-sm hover:bg-emerald-100 transition-colors"
          >
            Income
          </Link>
          <Link
            to="/finance/transactions?type=EXPENSE"
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800 shadow-sm hover:bg-red-100 transition-colors"
          >
            Expenses
          </Link>
          <Link
            to="/finance/transactions"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            All Transactions
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-xs font-semibold uppercase tracking-wider ${card.tone}`}
              >
                {card.label}
              </span>
              <span className={`rounded-full p-2 ${card.chip}`}>
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.75}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={card.icon}
                  />
                </svg>
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="mt-1 text-xs text-gray-500">{card.hint}</p>
          </div>
        ))}
      </div>

      {/* Reconciliation note — cancelled rows are excluded from every total, so
          the counts are surfaced next to the figures. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
        <span>
          Totals cover <strong className="text-gray-900">{formatCount(activeCount)}</strong>
        </span>
        {cancelledCount > 0 && (
          <span>
            <strong className="text-gray-900">{cancelledCount}</strong> cancelled
            transaction{cancelledCount === 1 ? '' : 's'} excluded
          </span>
        )}
        <Link
          to="/finance/transactions"
          className="font-semibold text-indigo-600 hover:text-indigo-800"
        >
          View full ledger →
        </Link>
      </div>

      {/* Category breakdowns */}
      <div className="grid gap-6 lg:grid-cols-2">
        <BreakdownCard
          title="Income by Category"
          subtitle="All recorded revenue, active transactions only"
          rows={incomeBreakdown}
          total={summary.totalIncome}
          loading={loading}
          emptyMessage="No income recorded yet."
        />
        <BreakdownCard
          title="Expenses by Category"
          subtitle="All recorded spending, active transactions only"
          rows={expenseBreakdown}
          total={summary.totalExpenses}
          loading={loading}
          emptyMessage="No expenses recorded yet."
        />
      </div>

      {/* Recent transactions */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Recent Transactions</h2>
            <p className="text-xs text-gray-500">Latest entries in the ledger</p>
          </div>
          <Link
            to="/finance/transactions"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <span className="ml-3 text-sm text-gray-500">Loading transactions…</span>
          </div>
        ) : recent.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            No transactions yet. Completing a payment, receiving stock, or
            finishing a maintenance task with a cost will record one here.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recent.map((transaction) => {
              const typeBadge = TYPE_BADGE[transaction.type];
              const statusBadge = STATUS_BADGE[transaction.status];
              const isCancelled = transaction.status === 'CANCELLED';

              return (
                <li
                  key={transaction.transactionId}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <Link
                      to={`/finance/transactions/${transaction.transactionId}`}
                      className={`truncate text-sm font-semibold hover:text-indigo-700 ${
                        isCancelled
                          ? 'text-gray-400 line-through'
                          : 'text-gray-900'
                      }`}
                    >
                      {transaction.description}
                    </Link>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {formatDate(transaction.transactionDate)} ·{' '}
                      {categoryLabel(transaction.category)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${typeBadge.cls}`}
                    >
                      {typeBadge.label}
                    </span>
                    {isCancelled && (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusBadge.cls}`}
                      >
                        {statusBadge.label}
                      </span>
                    )}
                    <span
                      className={`text-sm font-bold ${
                        isCancelled ? 'text-gray-400 line-through' : typeBadge.tone
                      }`}
                    >
                      {typeBadge.sign} {formatCurrency(transaction.amount)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
