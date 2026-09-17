import api from './api';
import type {
  ActivityItem,
  DashboardSummary,
  ExpenseReport,
  InvoiceOutstanding,
  OccupancyReport,
  ReportGroupBy,
  ReservationActivity,
  RevenueReport,
  RoomStatistics,
  TrendReport,
} from '../types/dashboard';
import type { FinanceCategory } from '../types/finance';

const rangeParams = (startDate?: string, endDate?: string) => ({
  ...(startDate ? { startDate } : {}),
  ...(endDate ? { endDate } : {}),
});

/**
 * Aggregated management figures in a single call.
 * Uses: GET /api/dashboard/summary
 *
 * The range narrows only `financeStatistics`; every other section is a
 * current-state snapshot.
 */
export const getSummary = async (
  startDate?: string,
  endDate?: string
): Promise<DashboardSummary> => {
  const response = await api.get<DashboardSummary>('/dashboard/summary', {
    params: rangeParams(startDate, endDate),
  });
  return response.data;
};

/**
 * Today's reservation figures — arrivals, departures and booking counts.
 * Uses: GET /api/dashboard/reservations/activity
 *
 * Also reachable by RECEPTIONIST, which is the one /api/dashboard path they
 * can read, so their dashboard can stay display-only too.
 */
export const getReservationActivity = async (): Promise<ReservationActivity> => {
  const response = await api.get<ReservationActivity>('/dashboard/reservations/activity');
  return response.data;
};

/**
 * Total revenue for a range.
 * Uses: GET /api/dashboard/revenue
 */
export const getRevenueReport = async (
  startDate?: string,
  endDate?: string
): Promise<RevenueReport> => {
  const response = await api.get<RevenueReport>('/dashboard/revenue', {
    params: rangeParams(startDate, endDate),
  });
  return response.data;
};

/**
 * Revenue broken down by finance category.
 * Uses: GET /api/dashboard/revenue/by-category
 */
export const getRevenueByCategory = async (
  startDate?: string,
  endDate?: string
): Promise<Partial<Record<FinanceCategory, number>>> => {
  const response = await api.get<Partial<Record<FinanceCategory, number>>>(
    '/dashboard/revenue/by-category',
    { params: rangeParams(startDate, endDate) }
  );
  return response.data;
};

/**
 * Revenue bucketed by day or month, with empty buckets returned as zero.
 * Uses: GET /api/dashboard/revenue/trend
 */
export const getRevenueTrend = async (
  startDate?: string,
  endDate?: string,
  groupBy: ReportGroupBy = 'DAY'
): Promise<TrendReport> => {
  const response = await api.get<TrendReport>('/dashboard/revenue/trend', {
    params: { ...rangeParams(startDate, endDate), groupBy },
  });
  return response.data;
};

/**
 * Total expenses plus the per-category breakdown.
 * Uses: GET /api/dashboard/expenses
 */
export const getExpenseReport = async (
  startDate?: string,
  endDate?: string
): Promise<ExpenseReport> => {
  const response = await api.get<ExpenseReport>('/dashboard/expenses', {
    params: rangeParams(startDate, endDate),
  });
  return response.data;
};

/**
 * Expenses bucketed by day or month, with empty buckets returned as zero.
 * Uses: GET /api/dashboard/expenses/trend
 */
export const getExpenseTrend = async (
  startDate?: string,
  endDate?: string,
  groupBy: ReportGroupBy = 'DAY'
): Promise<TrendReport> => {
  const response = await api.get<TrendReport>('/dashboard/expenses/trend', {
    params: { ...rangeParams(startDate, endDate), groupBy },
  });
  return response.data;
};

/**
 * Room occupancy totals and rate.
 * Uses: GET /api/dashboard/occupancy
 *
 * Takes no range: occupancy is the state of the property right now.
 */
export const getOccupancyReport = async (): Promise<OccupancyReport> => {
  const response = await api.get<OccupancyReport>('/dashboard/occupancy');
  return response.data;
};

/**
 * Room status counts — available, reserved, occupied, cleaning, maintenance.
 * Uses: GET /api/dashboard/rooms/statistics
 *
 * Also readable by RECEPTIONIST, so their dashboard shows live availability
 * without counting the room list in the browser.
 */
export const getRoomStatistics = async (): Promise<RoomStatistics> => {
  const response = await api.get<RoomStatistics>('/dashboard/rooms/statistics');
  return response.data;
};

/**
 * Invoiced, paid, and outstanding balances across all invoices.
 * Uses: GET /api/dashboard/invoices/outstanding
 *
 * The only /api/dashboard path ACCOUNTANT can read.
 */
export const getInvoiceOutstanding = async (): Promise<InvoiceOutstanding> => {
  const response = await api.get<InvoiceOutstanding>('/dashboard/invoices/outstanding');
  return response.data;
};

/**
 * Newest-first feed of recent payments, refunds, stock receipts, maintenance
 * costs and reservations.
 * Uses: GET /api/dashboard/recent-activity
 */
export const getRecentActivity = async (limit?: number): Promise<ActivityItem[]> => {
  const response = await api.get<ActivityItem[]>('/dashboard/recent-activity', {
    params: limit ? { limit } : {},
  });
  return response.data;
};
