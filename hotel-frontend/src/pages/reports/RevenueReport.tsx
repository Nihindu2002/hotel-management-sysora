import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getRevenueByCategory,
  getRevenueReport,
  getRevenueTrend,
} from '../../services/dashboardService';
import DateRangeFilter from './components/DateRangeFilter';
import { useReportRange } from './useReportRange';
import TrendChart from './components/TrendChart';
import CategoryBarChart from './components/CategoryBarChart';
import {
  INCOME_COLOR,
  categoryLabel,
  formatCurrency,
  isTrendEmpty,
  toCategoryRows,
} from './reportMeta';
import { formatRangeLabel } from '../../utils/dateRange';
import type { FinanceCategory } from '../../types/finance';
import type { TrendReport } from '../../types/dashboard';

interface ReportState {
  total: number;
  daily: TrendReport | null;
  monthly: TrendReport | null;
  byCategory: Partial<Record<FinanceCategory, number>>;
}

const EMPTY: ReportState = { total: 0, daily: null, monthly: null, byCategory: {} };

export default function RevenueReport() {
  const rangeState = useReportRange();
  const { range } = rangeState;

  const [data, setData] = useState<ReportState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // A custom range is only meaningful once both ends are filled in.
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

      // The selected window goes to the backend; the client does no bucketing
      // or summing of its own.
      const [report, daily, monthly, byCategory] = await Promise.all([
        getRevenueReport(range.startDate, range.endDate),
        getRevenueTrend(range.startDate, range.endDate, 'DAY'),
        getRevenueTrend(range.startDate, range.endDate, 'MONTH'),
        getRevenueByCategory(range.startDate, range.endDate),
      ]);

      setData({
        total: report.totalRevenue,
        daily,
        monthly,
        byCategory,
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load the revenue report.');
    } finally {
      setLoading(false);
    }
  }, [range.startDate, range.endDate, rangeValid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const categoryRows = toCategoryRows(data.byCategory);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link to="/reports" className="hover:text-gray-700">
              Reports
            </Link>
            <span>/</span>
            <span className="text-gray-900">Revenue</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Revenue Report</h1>
          <p className="mt-0.5 text-sm text-gray-600">
            Income recorded across the selected period, bucketed and categorised by
            the backend.
          </p>
        </div>
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
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
          Total Revenue
        </p>
        <p className="mt-1 text-3xl font-bold text-gray-900">
          {formatCurrency(data.total)}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {rangeValid ? `For ${formatRangeLabel(range)}` : 'Select a date range'}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily revenue */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Daily Revenue</h2>
          <p className="mb-4 text-xs text-gray-500">
            One point per day in the range, empty days shown as zero
          </p>

          <TrendChart
            points={data.daily?.points ?? []}
            groupBy="DAY"
            color={INCOME_COLOR}
            seriesName="Revenue"
            emptyMessage="No revenue recorded in this range."
            loading={loading}
          />
        </div>

        {/* Monthly revenue */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Monthly Revenue</h2>
          <p className="mb-4 text-xs text-gray-500">
            The same range rolled up by calendar month
          </p>

          <TrendChart
            points={data.monthly?.points ?? []}
            groupBy="MONTH"
            color={INCOME_COLOR}
            seriesName="Revenue"
            emptyMessage="No revenue recorded in this range."
            loading={loading}
          />
        </div>
      </div>

      {/* Revenue by category */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">Revenue by Category</h2>
        <p className="mb-4 text-xs text-gray-500">
          Where the income came from
        </p>

        <CategoryBarChart
          rows={categoryRows}
          color={INCOME_COLOR}
          useCategoryColors
          emptyMessage="No revenue recorded in this range."
          loading={loading}
          height={Math.max(240, categoryRows.length * 52)}
        />

        {!loading && categoryRows.length > 0 && (
          <ul className="mt-5 divide-y divide-gray-100 border-t border-gray-100">
            {categoryRows.map((row) => (
              <li key={row.category} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-gray-700">
                  {categoryLabel(row.category)}
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(row.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!loading && rangeValid && isTrendEmpty(data.daily?.points ?? []) && (
        <p className="text-center text-sm text-gray-500">
          No revenue was recorded between {formatRangeLabel(range)}.
        </p>
      )}
    </div>
  );
}
