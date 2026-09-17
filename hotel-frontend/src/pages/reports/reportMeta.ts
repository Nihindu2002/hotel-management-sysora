import type { FinanceCategory } from '../../types/finance';
import type { ReportGroupBy, TrendPoint } from '../../types/dashboard';

/**
 * Category labels come from the finance feature so the reports, the finance
 * ledger, and the finance dashboard all name categories identically.
 */
export { CATEGORY_LABEL, categoryLabel, formatCurrency } from '../finance/financeMeta';

/** Income and expense series colours, matching the finance ledger badges. */
export const INCOME_COLOR = '#059669';
export const EXPENSE_COLOR = '#dc2626';

/** Per-category chart colours (hex forms of the ledger's bar classes). */
export const CATEGORY_COLOR: Record<FinanceCategory, string> = {
  ROOM_REVENUE: '#10b981',
  FOOD_REVENUE: '#14b8a6',
  OTHER_REVENUE: '#84cc16',
  INVENTORY: '#f59e0b',
  SALARY: '#6366f1',
  MAINTENANCE: '#f97316',
  UTILITIES: '#0ea5e9',
  RENT: '#8b5cf6',
  MARKETING: '#ec4899',
  TAX: '#f43f5e',
  REFUND: '#ef4444',
  OTHER: '#9ca3af',
};

export const FALLBACK_CATEGORY_COLOR = '#d1d5db';
export const CHART_GRID = '#e5e7eb';
export const AXIS_TICK = { fill: '#6b7280', fontSize: 12 };

export interface ChartPoint {
  /** First day of the bucket, `YYYY-MM-DD` — the raw value from the API. */
  period: string;
  /** Pre-formatted axis label. */
  label: string;
  amount: number;
}

const parseIsoDate = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Axis labels are derived from the bucket date. Parsing the `YYYY-MM-DD` parts
 * directly avoids `new Date('…')`, which reads the string as UTC midnight and
 * can label a bucket with the previous day.
 */
export const formatBucketLabel = (period: string, groupBy: ReportGroupBy): string => {
  const date = parseIsoDate(period);
  if (!date) return period;

  return groupBy === 'MONTH'
    ? date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const toChartPoints = (
  points: TrendPoint[],
  groupBy: ReportGroupBy
): ChartPoint[] =>
  points.map((point) => ({
    period: point.periodStart,
    label: formatBucketLabel(point.periodStart, groupBy),
    amount: point.amount,
  }));

/** Compact axis ticks — full LKR amounts would collide on a narrow axis. */
export const formatCompactCurrency = (value: number): string => {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (absolute >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return value.toFixed(0);
};

/** A trend with no movement at all — used to show an empty state instead. */
export const isTrendEmpty = (points: TrendPoint[]): boolean =>
  points.length === 0 || points.every((point) => point.amount === 0);

export interface CategoryRow {
  category: FinanceCategory;
  amount: number;
}

/** A category map from the API as a sorted, renderable list. */
export const toCategoryRows = (
  map: Partial<Record<FinanceCategory, number>>
): CategoryRow[] =>
  (Object.entries(map) as [FinanceCategory, number][])
    .filter(([, amount]) => amount > 0)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
