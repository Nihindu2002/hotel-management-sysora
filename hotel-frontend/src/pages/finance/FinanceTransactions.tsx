import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getTransactions } from '../../services/financeService';
import {
  REFERENCE_TYPE_LABEL,
  STATUSES,
  STATUS_BADGE,
  TYPES,
  TYPE_BADGE,
  categoriesForType,
  categoryLabel,
  asCategory,
  asStatus,
  asTransactionType,
  formatCount,
  formatCurrency,
  formatDate,
  sortByNewest,
} from './financeMeta';
import type {
  FinanceCategory,
  FinanceStatus,
  FinanceTransaction,
  FinanceTransactionType,
} from '../../types/finance';

/** Firebase UIDs are long; show enough to recognise, keep the column narrow. */
const shorten = (value: string, length = 12): string =>
  value.length > length ? `${value.slice(0, length)}…` : value;

export default function FinanceTransactions() {
  const [searchParams] = useSearchParams();

  // Filters can arrive as a query string so the dashboard can deep-link into a
  // pre-filtered ledger (e.g. /finance/transactions?type=INCOME).
  const paramType = asTransactionType(searchParams.get('type'));
  const paramCategory = asCategory(searchParams.get('category'));
  const paramStatus = asStatus(searchParams.get('status'));

  // The category also has to be valid for the type, or the dropdown would render
  // with no matching option and never return a row.
  const initialCategory =
    paramCategory !== 'ALL' && categoriesForType(paramType).includes(paramCategory)
      ? paramCategory
      : 'ALL';

  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] =
    useState<FinanceTransactionType | 'ALL'>(paramType);
  const [categoryFilter, setCategoryFilter] =
    useState<FinanceCategory | 'ALL'>(initialCategory);
  const [statusFilter, setStatusFilter] =
    useState<FinanceStatus | 'ALL'>(paramStatus);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadTransactions = useCallback(async () => {
    try {
      setError(null);
      setTransactions(await getTransactions());
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load finance transactions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const invalidRange = Boolean(startDate && endDate && startDate > endDate);

  const handleTypeChange = (next: FinanceTransactionType | 'ALL') => {
    setTypeFilter(next);
    // A category that is only valid for the previous type would guarantee an
    // empty result, so drop it when the type narrows.
    if (categoryFilter !== 'ALL' && !categoriesForType(next).includes(categoryFilter)) {
      setCategoryFilter('ALL');
    }
  };

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('ALL');
    setCategoryFilter('ALL');
    setStatusFilter('ALL');
    setStartDate('');
    setEndDate('');
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sortByNewest(transactions).filter((transaction) => {
      if (typeFilter !== 'ALL' && transaction.type !== typeFilter) return false;
      if (categoryFilter !== 'ALL' && transaction.category !== categoryFilter) return false;
      if (statusFilter !== 'ALL' && transaction.status !== statusFilter) return false;

      if (query) {
        const haystack = `${transaction.description ?? ''} ${
          transaction.referenceId ?? ''
        }`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      // An inverted range matches nothing, which is what the warning explains.
      if (invalidRange) return false;

      // `transactionDate` is `YYYY-MM-DD`, so lexicographic order is date order.
      // Comparing the strings avoids re-introducing a timezone offset.
      const date = transaction.transactionDate ?? '';
      if (startDate && date < startDate) return false;
      if (endDate && date > endDate) return false;

      return true;
    });
  }, [transactions, search, typeFilter, categoryFilter, statusFilter, startDate, endDate, invalidRange]);

  /** Cancelled rows are shown but never counted, matching the summary endpoint. */
  const totals = useMemo(() => {
    const active = filtered.filter((t) => t.status === 'ACTIVE');
    const income = active
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + (t.amount ?? 0), 0);
    const expenses = active
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + (t.amount ?? 0), 0);

    return {
      income,
      expenses,
      net: income - expenses,
      cancelled: filtered.length - active.length,
    };
  }, [filtered]);

  const categoryOptions = categoriesForType(typeFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/finance" className="text-sm font-medium text-gray-500 hover:text-gray-700">
              Finance
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-sm font-medium text-gray-900">Transactions</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="mt-0.5 text-sm text-gray-600">
            Every income and expense entry, including those recorded automatically
            by other modules.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Search
            </label>
            <div className="relative">
              <svg
                className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 0z"
                />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by description or reference…"
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) =>
                handleTypeChange(e.target.value as FinanceTransactionType | 'ALL')
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Types</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_BADGE[t].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as FinanceCategory | 'ALL')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Categories</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FinanceStatus | 'ALL')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_BADGE[s].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              From
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              To
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {invalidRange && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          The "From" date is after the "To" date, so no transactions can match.
        </div>
      )}

      {/* Summary strip */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-600">
        <span>
          <strong className="text-gray-900">{formatCount(filtered.length)}</strong> shown
        </span>
        <span>
          Income: <strong className="text-emerald-700">{formatCurrency(totals.income)}</strong>
        </span>
        <span>
          Expenses: <strong className="text-red-700">{formatCurrency(totals.expenses)}</strong>
        </span>
        <span>
          Net:{' '}
          <strong className={totals.net >= 0 ? 'text-emerald-700' : 'text-red-700'}>
            {formatCurrency(totals.net)}
          </strong>
        </span>
        {totals.cancelled > 0 && (
          <span className="text-gray-500">
            {totals.cancelled} cancelled excluded from totals
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <span className="ml-3 text-sm text-gray-500">Loading transactions…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            No transactions match your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-left">Reference</th>
                  <th className="px-4 py-3 text-left">Performed By</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((transaction) => {
                  const typeBadge = TYPE_BADGE[transaction.type];
                  const statusBadge = STATUS_BADGE[transaction.status];
                  const isCancelled = transaction.status === 'CANCELLED';

                  return (
                    <tr key={transaction.transactionId} className="hover:bg-gray-50 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                        {formatDate(transaction.transactionDate)}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${typeBadge.cls}`}
                        >
                          {typeBadge.label}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {categoryLabel(transaction.category)}
                      </td>

                      <td
                        className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${
                          isCancelled ? 'text-gray-400 line-through' : typeBadge.tone
                        }`}
                      >
                        {typeBadge.sign} {formatCurrency(transaction.amount)}
                      </td>

                      <td className="max-w-xs px-4 py-3">
                        <Link
                          to={`/finance/transactions/${transaction.transactionId}`}
                          className={`font-medium hover:text-indigo-700 ${
                            isCancelled ? 'text-gray-400 line-through' : 'text-gray-900'
                          }`}
                        >
                          {transaction.description}
                        </Link>
                      </td>

                      <td className="px-4 py-3">
                        {transaction.referenceId ? (
                          <>
                            <span
                              className="block font-mono text-xs text-gray-700"
                              title={transaction.referenceId}
                            >
                              {shorten(transaction.referenceId)}
                            </span>
                            {transaction.referenceType && (
                              <span className="block text-[11px] text-gray-400">
                                {REFERENCE_TYPE_LABEL[transaction.referenceType]}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {transaction.performedBy ? (
                          <span
                            className="font-mono text-xs text-gray-600"
                            title={transaction.performedBy}
                          >
                            {shorten(transaction.performedBy, 14)}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadge.cls}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dot}`} />
                          {statusBadge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
