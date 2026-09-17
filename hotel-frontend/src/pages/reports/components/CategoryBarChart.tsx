import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { FinanceCategory } from '../../../types/finance';
import {
  AXIS_TICK,
  CATEGORY_COLOR,
  categoryLabel,
  FALLBACK_CATEGORY_COLOR,
  formatCompactCurrency,
  formatCurrency,
} from '../reportMeta';

interface CategoryBarChartProps {
  rows: { category: FinanceCategory; amount: number }[];
  color: string;
  /** Used per bar for the revenue/expense category mix. */
  useCategoryColors?: boolean;
  emptyMessage: string;
  loading?: boolean;
  height?: number;
}

export default function CategoryBarChart({
  rows,
  color,
  useCategoryColors = false,
  emptyMessage,
  loading = false,
  height = 320,
}: CategoryBarChartProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        <span className="ml-3 text-sm text-gray-500">Loading chart…</span>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 text-sm text-gray-400"
        style={{ height }}
      >
        {emptyMessage}
      </div>
    );
  }

  // Horizontal bars keep long category names readable without rotated ticks.
  const data = rows.map((row) => ({
    ...row,
    label: categoryLabel(row.category),
  }));

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
          <XAxis
            type="number"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCompactCurrency}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={150}
          />
          <Tooltip
            formatter={(value: any) => [formatCurrency(Number(value)), 'Amount']}
            contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
            cursor={{ fill: 'rgba(0,0,0,0.03)' }}
          />
          <Bar dataKey="amount" radius={[0, 4, 4, 0]} maxBarSize={26}>
            {data.map((row) => (
              <Cell
                key={row.category}
                fill={
                  useCategoryColors
                    ? CATEGORY_COLOR[row.category] ?? FALLBACK_CATEGORY_COLOR
                    : color
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
