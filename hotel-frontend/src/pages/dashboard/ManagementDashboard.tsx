import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getInvoiceOutstanding,
  getRecentActivity,
  getReservationActivity,
  getRevenueReport,
  getSummary,
} from '../../services/dashboardService';
import {
  ACTIVITY_META,
  RESERVATION_STATUS_LABEL,
  ROOM_STATUS_META,
  formatCurrency,
  formatDateTime,
} from './dashboardMeta';
import { currentMonthLabel, formatRangeLabel, thisMonthRange, todayRange } from '../../utils/dateRange';
import type {
  ActivityItem,
  DashboardSummary,
  InvoiceOutstanding,
  ReservationActivity,
} from '../../types/dashboard';
import type { ReservationStatus } from '../../types/reservation';
import type { RoomStatus } from '../../types/room';

interface StatCard {
  label: string;
  value: string;
  hint: string;
  tone: string;
  chip: string;
  icon: string;
}

const RESERVATION_FLOW: ReservationStatus[] = [
  'PENDING',
  'CONFIRMED',
  'CHECKED_IN',
  'CHECKED_OUT',
  'CANCELLED',
];

const ROOM_FLOW: RoomStatus[] = [
  'AVAILABLE',
  'RESERVED',
  'OCCUPIED',
  'CLEANING',
  'MAINTENANCE',
];

export default function ManagementDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [activity, setActivity] = useState<ReservationActivity | null>(null);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [outstanding, setOutstanding] = useState<InvoiceOutstanding | null>(null);
  const [recent, setRecent] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => todayRange(), []);
  const month = useMemo(() => thisMonthRange(), []);
  const monthLabel = useMemo(() => currentMonthLabel(), []);

  const loadData = useCallback(async () => {
    try {
      setError(null);

      // Every figure comes from the API already aggregated — nothing on this
      // page is summed or counted in the browser.
      const [summaryData, activityData, todayData, monthData, outstandingData, recentData] =
        await Promise.all([
          getSummary(),
          getReservationActivity(),
          getRevenueReport(today.startDate, today.endDate),
          getRevenueReport(month.startDate, month.endDate),
          getInvoiceOutstanding(),
          getRecentActivity(8),
        ]);

      setSummary(summaryData);
      setActivity(activityData);
      setTodayRevenue(todayData.totalRevenue);
      setMonthRevenue(monthData.totalRevenue);
      setOutstanding(outstandingData);
      setRecent(recentData);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load the dashboard.');
    } finally {
      setLoading(false);
    }
  }, [today.startDate, today.endDate, month.startDate, month.endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const rooms = summary?.roomStatistics;
  const reservations = summary?.reservationStatistics;
  const inventory = summary?.inventoryStatistics;

  const reservationCards: StatCard[] = [
    {
      label: "Today's Reservations",
      value: (activity?.todayReservations ?? 0).toString(),
      hint: 'Bookings created today',
      tone: 'text-indigo-600',
      chip: 'bg-indigo-50 text-indigo-600',
      icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
    },
    {
      label: 'Pending Reservations',
      value: (activity?.pendingReservations ?? 0).toString(),
      hint: 'Awaiting confirmation',
      tone: 'text-amber-600',
      chip: 'bg-amber-50 text-amber-600',
      icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
      label: 'Check-ins Today',
      value: (activity?.todayArrivals ?? 0).toString(),
      hint: 'Arrivals scheduled today',
      tone: 'text-emerald-600',
      chip: 'bg-emerald-50 text-emerald-600',
      icon: 'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75',
    },
    {
      label: 'Check-outs Today',
      value: (activity?.todayDepartures ?? 0).toString(),
      hint: 'Departures scheduled today',
      tone: 'text-sky-600',
      chip: 'bg-sky-50 text-sky-600',
      icon: 'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H3',
    },
  ];

  const roomCards: StatCard[] = [
    {
      label: 'Available Rooms',
      value: (rooms?.availableRooms ?? 0).toString(),
      hint: `of ${rooms?.totalRooms ?? 0} rooms`,
      tone: 'text-emerald-600',
      chip: 'bg-emerald-50 text-emerald-600',
      icon: 'M9 12.75L11.25 15L15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
      label: 'Occupied Rooms',
      value: (rooms?.occupiedRooms ?? 0).toString(),
      hint: 'Currently hosting guests',
      tone: 'text-indigo-600',
      chip: 'bg-indigo-50 text-indigo-600',
      icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75',
    },
    {
      label: 'Cleaning Rooms',
      value: (rooms?.cleaningRooms ?? 0).toString(),
      hint: 'With housekeeping',
      tone: 'text-amber-600',
      chip: 'bg-amber-50 text-amber-600',
      icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z',
    },
    {
      label: 'Maintenance Rooms',
      value: (rooms?.maintenanceRooms ?? 0).toString(),
      hint: 'Out of service',
      tone: 'text-red-600',
      chip: 'bg-red-50 text-red-600',
      icon: 'M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.32l-3.276 3.277a1.5 1.5 0 01-2.121-2.122l3.276-3.275a4.5 4.5 0 00-6.32 4.486c.048.58.024 1.193-.14 1.743',
    },
  ];

  const financeCards: StatCard[] = [
    {
      label: "Today's Revenue",
      value: formatCurrency(todayRevenue),
      hint: formatRangeLabel(today),
      tone: 'text-emerald-600',
      chip: 'bg-emerald-50 text-emerald-600',
      icon: 'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941',
    },
    {
      label: `${monthLabel} Revenue`,
      value: formatCurrency(monthRevenue),
      hint: 'Month to date',
      tone: 'text-teal-600',
      chip: 'bg-teal-50 text-teal-600',
      icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
    },
    {
      label: 'Outstanding Invoices',
      value: formatCurrency(outstanding?.totalOutstanding ?? 0),
      hint: `${outstanding?.outstandingInvoices ?? 0} unpaid or partly paid`,
      tone: 'text-red-600',
      chip: 'bg-red-50 text-red-600',
      icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-6.75 4.5h16.5A2.25 2.25 0 0021.75 18.5V6.75A2.25 2.25 0 0019.5 4.5H4.5A2.25 2.25 0 002.25 6.75v11.75A2.25 2.25 0 004.5 21z',
    },
    {
      label: 'Low-stock Items',
      value: (inventory?.lowStockItems ?? 0).toString(),
      hint: `of ${inventory?.totalItems ?? 0} inventory items`,
      tone: 'text-orange-600',
      chip: 'bg-orange-50 text-orange-600',
      icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
    },
  ];

  const renderCards = (cards: StatCard[], title: string) => (
    <section>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500">{title}</h2>
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
    </section>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Management Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Live occupancy, reservations, revenue, and stock across the property.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
              Loading…
            </div>
          )}
          <Link
            to="/reports"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            Open Reports
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {renderCards(reservationCards, 'Reservations')}
      {renderCards(roomCards, 'Rooms')}
      {renderCards(financeCards, 'Revenue & Stock')}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Room status */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Rooms by Status</h2>
              <p className="text-xs text-gray-500">
                {rooms?.totalRooms ?? 0} rooms on the property
              </p>
            </div>
            <Link to="/reports/occupancy" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              Full report →
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500">Loading…</div>
          ) : !rooms || rooms.totalRooms === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">No rooms configured yet.</div>
          ) : (
            <ul className="space-y-3">
              {ROOM_FLOW.map((status) => {
                const counts: Record<RoomStatus, number> = {
                  AVAILABLE: rooms.availableRooms,
                  RESERVED: rooms.reservedRooms,
                  OCCUPIED: rooms.occupiedRooms,
                  CLEANING: rooms.cleaningRooms,
                  MAINTENANCE: rooms.maintenanceRooms,
                };
                const count = counts[status];
                const meta = ROOM_STATUS_META[status];

                return (
                  <li key={status}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-800">{meta.label}</span>
                      <span className="font-semibold text-gray-900">{count}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${meta.bar}`}
                        style={{ width: `${(count / rooms.totalRooms) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Reservation status */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">Reservations by Status</h2>
            <p className="text-xs text-gray-500">
              {reservations?.totalReservations ?? 0} reservations on record
            </p>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500">Loading…</div>
          ) : !reservations || reservations.totalReservations === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">No reservations yet.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {RESERVATION_FLOW.map((status) => {
                const counts: Record<ReservationStatus, number> = {
                  PENDING: reservations.pendingReservations,
                  CONFIRMED: reservations.confirmedReservations,
                  CHECKED_IN: reservations.checkedInReservations,
                  CHECKED_OUT: reservations.checkedOutReservations,
                  CANCELLED: reservations.cancelledReservations,
                };

                return (
                  <li key={status} className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-gray-700">
                      {RESERVATION_STATUS_LABEL[status]}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{counts[status]}</span>
                  </li>
                );
              })}
            </ul>
          )}

          {activity && (
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <p className="text-xs text-gray-500">Currently checked in</p>
                <p className="text-lg font-bold text-gray-900">{activity.currentlyCheckedIn}</p>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <p className="text-xs text-gray-500">Confirmed upcoming</p>
                <p className="text-lg font-bold text-gray-900">{activity.confirmedReservations}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
          <p className="text-xs text-gray-500">
            Latest payments, stock receipts, maintenance costs, and bookings
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <span className="ml-3 text-sm text-gray-500">Loading activity…</span>
          </div>
        ) : recent.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            No activity recorded yet.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recent.map((item, index) => {
              const meta = ACTIVITY_META[item.activityType] ?? ACTIVITY_META.OTHER;

              return (
                <li
                  key={`${item.activityType}-${item.referenceId ?? index}`}
                  className="flex items-start gap-3 py-3"
                >
                  <span className={`mt-0.5 shrink-0 rounded-full border p-1.5 ${meta.cls}`}>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={meta.icon} />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-gray-900">{item.description}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {meta.label}
                      {item.referenceId ? ` · ${item.referenceId.slice(0, 8)}…` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-500">
                    {formatDateTime(item.timestamp)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
