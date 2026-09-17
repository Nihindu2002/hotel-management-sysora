import type { FinanceCategory } from './finance';

/** Bucket size for trend series; the backend fills empty buckets with zero. */
export type ReportGroupBy = 'DAY' | 'MONTH';

export interface TrendPoint {
  /** First day of the bucket — `YYYY-MM-DD`. */
  periodStart: string;
  amount: number;
}

export interface TrendReport {
  startDate?: string | null;
  endDate?: string | null;
  groupBy: ReportGroupBy;
  points: TrendPoint[];
}

export interface RoomStatistics {
  totalRooms: number;
  availableRooms: number;
  reservedRooms: number;
  occupiedRooms: number;
  cleaningRooms: number;
  maintenanceRooms: number;
}

export interface ReservationStatistics {
  totalReservations: number;
  pendingReservations: number;
  confirmedReservations: number;
  checkedInReservations: number;
  checkedOutReservations: number;
  cancelledReservations: number;
}

export interface FinanceStatistics {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
}

export interface InventoryStatistics {
  totalItems: number;
  activeItems: number;
  inactiveItems: number;
  lowStockItems: number;
}

export interface HousekeepingStatistics {
  totalTasks: number;
  pendingTasks: number;
  assignedTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  cancelledTasks: number;
}

export interface MaintenanceStatistics {
  totalTasks: number;
  pendingTasks: number;
  assignedTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  cancelledTasks: number;
}

/**
 * Every figure is computed server-side; the client only renders. `startDate`
 * and `endDate` narrow the finance section alone — the room, reservation,
 * inventory, housekeeping and maintenance sections are always current-state.
 */
export interface DashboardSummary {
  roomStatistics: RoomStatistics;
  reservationStatistics: ReservationStatistics;
  financeStatistics: FinanceStatistics;
  inventoryStatistics: InventoryStatistics;
  housekeepingStatistics: HousekeepingStatistics;
  maintenanceStatistics: MaintenanceStatistics;
}

export interface RevenueReport {
  startDate?: string | null;
  endDate?: string | null;
  totalRevenue: number;
}

export interface ExpenseReport {
  startDate?: string | null;
  endDate?: string | null;
  totalExpenses: number;
  /** Categories with no expenses in the range are absent from the map. */
  expensesByCategory: Partial<Record<FinanceCategory, number>>;
}

export interface OccupancyReport {
  totalRooms: number;
  occupiedRooms: number;
  occupancyRate: number;
}

export interface ReservationActivity {
  todayReservations: number;
  todayArrivals: number;
  todayDepartures: number;
  pendingReservations: number;
  confirmedReservations: number;
  currentlyCheckedIn: number;
}

export interface InvoiceOutstanding {
  totalInvoices: number;
  outstandingInvoices: number;
  paidInvoices: number;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
}

export type ActivityType =
  | 'RESERVATION'
  | 'PAYMENT'
  | 'REFUND'
  | 'INVENTORY'
  | 'MAINTENANCE'
  | 'OTHER';

export interface ActivityItem {
  activityType: ActivityType;
  description: string;
  referenceId?: string | null;
  timestamp: string;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}
