import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getExpenseReport, getExpenseTrend } from '../../services/dashboardService';
import DateRangeFilter from './components/DateRangeFilter';
import { useReportRange } from './useReportRange';
import TrendChart from './components/TrendChart';
import CategoryBarChart from './components/CategoryBarChart';
import {
  EXPENSE_COLOR,
  categoryLabel,
  formatCurrency,
  toCategoryRows,
} from './reportMeta';
import { formatRangeLabel } from '../../utils/dateRange';
import type { FinanceCategory } from '../../types/finance';
import type { ReportGroupBy, TrendReport } from '../../types/dashboard';

interface ReportState {
  total: number;
  trend: TrendReport | null;
  byCategory: Partial<Record<FinanceCategory, number>>;
}

const EMPTY: ReportState = { total: 0, trend: null, byCategory: {} };

export default function ExpenseReport() {
  const rangeState = useReportRange();
  const { range } = rangeState;

  // The single expense trend chart can be viewed per day or per month; both are
  // bucketed by the backend.
  const [groupBy, setGroupBy] = useState<ReportGroupBy>('DAY');
  const [data, setData] = useState<ReportState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rangeReady = Boolean(range.startDate && range.endDate);
  const rangeValid = rangeReady && range.startDate <= range.endDate;

  const loadData = useCallback(async () => {
    if (!rangeValid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [report, trend] = await Promise.all([
        getExpenseReport(range.startDate, range.endDate),
        getExpenseTrend(range.startDate, range.endDate, groupBy),
      ]);

      setData({
        total: report.totalExpenses,
        trend,
        byCategory: report.expensesByCategory,
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load the expense report.');
    } finally {
      setLoading(false);
    }
  }, [range.startDate, range.endDate, rangeValid, groupBy]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const categoryRows = toCategoryRows(data.byCategory);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link to="/reports" className="hover:text-gray-700">
            Reports
          </Link>
          <span>/</span>
          <span className="text-gray-900">Expenses</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">Expense Report</h1>
        <p className="mt-0.5 text-sm text-gray-600">
          Spending across the selected period, categorised and bucketed by the
          backend.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <DateRangeFilter
        state={rangeState}
        summary={rangeValid ? formatRangeLabel(range) : undefined}
      />

      {/* Total */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-red-600">
          Total Expenses
        </p>
        <p className="mt-1 text-3xl font-bold text-gray-900">
          {formatCurrency(data.total)}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {rangeValid ? `For ${formatRangeLabel(range)}` : 'Select a date range'}
        </p>
      </div>

      {/* Expense trend */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Expense Trend</h2>
            <p className="text-xs text-gray-500">
              {groupBy === 'DAY'
                ? 'One point per day, empty days shown as zero'
                : 'Rolled up by calendar month'}
            </p>
          </div>

          <div className="flex gap-2">
            {(['DAY', 'MONTH'] as ReportGroupBy[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setGroupBy(option)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  groupBy === option
                    ? 'border-red-600 bg-red-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {option === 'DAY' ? 'Daily' : 'Monthly'}
              </button>
            ))}
          </div>
        </div>

        <TrendChart
          points={data.trend?.points ?? []}
          groupBy={groupBy}
          color={EXPENSE_COLOR}
          seriesName="Expenses"
          emptyMessage="No expenses recorded in this range."
          loading={loading}
        />
      </div>

      {/* Expenses by category */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">Expenses by Category</h2>
        <p className="mb-4 text-xs text-gray-500">Where the money was spent</p>

        <CategoryBarChart
          rows={categoryRows}
          color={EXPENSE_COLOR}
          useCategoryColors
          emptyMessage="No expenses recorded in this range."
          loading={loading}
          height={Math.max(240, categoryRows.length * 52)}
        />

        {!loading && categoryRows.length > 0 && (
          <ul className="mt-5 divide-y divide-gray-100 border-t border-gray-100">
            {categoryRows.map((row) => (
              <li key={row.category} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-gray-700">{categoryLabel(row.category)}</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(row.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
