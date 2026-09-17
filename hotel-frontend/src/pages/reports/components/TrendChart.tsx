import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TrendPoint } from '../../../types/dashboard';
import type { ReportGroupBy } from '../../../types/dashboard';
import {
  AXIS_TICK,
  CHART_GRID,
  formatCompactCurrency,
  formatCurrency,
  isTrendEmpty,
  toChartPoints,
} from '../reportMeta';

interface TrendChartProps {
  points: TrendPoint[];
  groupBy: ReportGroupBy;
  color: string;
  /** Series name shown in the tooltip, e.g. "Revenue". */
  seriesName: string;
  emptyMessage: string;
  loading?: boolean;
}

/** Turn a period key (`2026-09-17`) into a readable tooltip heading. */
const formatTooltipLabel = (label: unknown): string => String(label ?? '');

export default function TrendChart({
  points,
  groupBy,
  color,
  seriesName,
  emptyMessage,
  loading = false,
}: TrendChartProps) {
  const data = toChartPoints(points, groupBy);
  const gradientId = `trend-${seriesName.toLowerCase().replace(/\s+/g, '-')}`;

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        <span className="ml-3 text-sm text-gray-500">Loading chart…</span>
      </div>
    );
  }

  if (isTrendEmpty(points)) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-gray-200 text-sm text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
          <XAxis
            dataKey="label"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: CHART_GRID }}
            minTickGap={16}
          />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={formatCompactCurrency}
          />
          <Tooltip
            formatter={(value: any) => [formatCurrency(Number(value)), seriesName]}
            labelFormatter={formatTooltipLabel}
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="amount"
            name={seriesName}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={data.length <= 1}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
