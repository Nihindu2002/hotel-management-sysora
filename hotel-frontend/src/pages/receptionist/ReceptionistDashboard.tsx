import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getReservationActivity, getRoomStatistics } from '../../services/dashboardService';
import { getAllInvoices } from '../../services/invoiceService';
import { getAllPayments } from '../../services/paymentService';
import { ROOM_STATUS_META } from '../dashboard/dashboardMeta';
import type { ReservationActivity, RoomStatistics } from '../../types/dashboard';
import type { Invoice } from '../../types/invoice';
import type { Payment } from '../../types/payment';

interface Card {
  label: string;
  value: string;
  hint: string;
  tone: string;
  chip: string;
  icon: string;
  to: string;
}

function formatMoney(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatTime(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function ReceptionistDashboard() {
  const [activity, setActivity] = useState<ReservationActivity | null>(null);
  const [rooms, setRooms] = useState<RoomStatistics | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);

      // The two dashboard endpoints are narrowed to include RECEPTIONIST. The
      // invoice and payment reads are allowed for this role too, so the desk
      // gets the money side of the day without a separate report.
      const [activityData, roomData, invoiceData, paymentData] = await Promise.all([
        getReservationActivity(),
        getRoomStatistics(),
        getAllInvoices().catch(() => [] as Invoice[]),
        getAllPayments().catch(() => [] as Payment[]),
      ]);

      setActivity(activityData);
      setRooms(roomData);
      setInvoices(invoiceData);
      setPayments(paymentData);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load your dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const outstanding = invoices.filter((invoice) => (invoice.remainingAmount ?? 0) > 0);
  const outstandingTotal = outstanding.reduce(
    (sum, invoice) => sum + (invoice.remainingAmount ?? 0),
    0,
  );

  const recentPayments = [...payments]
    .sort(
      (a, b) =>
        new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
    )
    .slice(0, 5);

  const cards: Card[] = [
    {
      label: "Today's Check-ins",
      value: (activity?.todayArrivals ?? 0).toString(),
      hint: 'Arriving today',
      tone: 'text-emerald-600',
      chip: 'bg-emerald-50 text-emerald-600',
      to: '/reservations',
      icon: 'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75',
    },
    {
      label: "Today's Check-outs",
      value: (activity?.todayDepartures ?? 0).toString(),
      hint: 'Departing today',
      tone: 'text-sky-600',
      chip: 'bg-sky-50 text-sky-600',
      to: '/reservations',
      icon: 'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H3',
    },
    {
      label: 'Rooms Occupied',
      value: (rooms?.occupiedRooms ?? 0).toString(),
      hint: `of ${rooms?.totalRooms ?? 0} rooms`,
      tone: 'text-purple-600',
      chip: 'bg-purple-50 text-purple-600',
      to: '/receptionist/rooms',
      icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75',
    },
    {
      label: 'Available Rooms',
      value: (rooms?.availableRooms ?? 0).toString(),
      hint: `of ${rooms?.totalRooms ?? 0} rooms ready now`,
      tone: 'text-indigo-600',
      chip: 'bg-indigo-50 text-indigo-600',
      to: '/receptionist/rooms',
      icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75',
    },
    {
      label: 'Active Reservations',
      value: (
        (activity?.confirmedReservations ?? 0) + (activity?.currentlyCheckedIn ?? 0)
      ).toString(),
      hint: `${activity?.pendingReservations ?? 0} still pending`,
      tone: 'text-amber-600',
      chip: 'bg-amber-50 text-amber-600',
      to: '/reservations',
      icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
    },
    {
      label: 'Outstanding Invoices',
      value: outstanding.length.toString(),
      hint: `${formatMoney(outstandingTotal)} still owed`,
      tone: 'text-red-600',
      chip: 'bg-red-50 text-red-600',
      to: '/invoices',
      icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-6.75 4.5h16.5A2.25 2.25 0 0021.75 18.5V6.75A2.25 2.25 0 0019.5 4.5H4.5A2.25 2.25 0 002.25 6.75v11.75A2.25 2.25 0 004.5 21z',
    },
  ];

  const roomCounts: [keyof typeof ROOM_STATUS_META, number][] = rooms
    ? [
        ['AVAILABLE', rooms.availableRooms],
        ['RESERVED', rooms.reservedRooms],
        ['OCCUPIED', rooms.occupiedRooms],
        ['CLEANING', rooms.cleaningRooms],
        ['MAINTENANCE', rooms.maintenanceRooms],
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Receptionist Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Today's front-desk movement, live room availability, and what is
            still owed.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {loading && (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-royal/30 border-t-royal" />
          )}
          <Link
            to="/reservations/new"
            className="inline-flex items-center gap-2 rounded-lg bg-royal px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-royal/90"
          >
            New reservation
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-royal/40 hover:shadow-md"
          >
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
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Room availability */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Room Availability</h2>
              <p className="text-xs text-gray-500">Every room, right now</p>
            </div>
            <Link
              to="/receptionist/rooms"
              className="text-xs font-semibold text-royal hover:underline"
            >
              View rooms →
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500">Loading…</div>
          ) : roomCounts.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              No rooms configured yet.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {roomCounts.map(([status, count]) => (
                <li key={status} className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-2 text-sm text-gray-700">
                    <span className={`h-2 w-2 rounded-full ${ROOM_STATUS_META[status].bar}`} />
                    {ROOM_STATUS_META[status].label}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Outstanding invoices */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Outstanding Invoices</h2>
              <p className="text-xs text-gray-500">
                {formatMoney(outstandingTotal)} owed across {outstanding.length}{' '}
                {outstanding.length === 1 ? 'bill' : 'bills'}
              </p>
            </div>
            <Link to="/invoices" className="text-xs font-semibold text-royal hover:underline">
              All invoices →
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500">Loading…</div>
          ) : outstanding.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              Everything is settled.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {outstanding.slice(0, 6).map((invoice) => (
                <li key={invoice.invoiceId} className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-gray-700">
                    {invoice.customerName ?? 'Guest'}
                    {invoice.roomNumber ? ` · Room ${invoice.roomNumber}` : ''}
                  </span>
                  <span className="text-sm font-semibold text-red-600">
                    {formatMoney(invoice.remainingAmount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent payments */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Recent Payments</h2>
              <p className="text-xs text-gray-500">Latest taken at the desk</p>
            </div>
            <Link to="/payments" className="text-xs font-semibold text-royal hover:underline">
              All payments →
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500">Loading…</div>
          ) : recentPayments.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              No payments recorded yet.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentPayments.map((payment) => (
                <li key={payment.paymentId} className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-gray-700">
                    {String(payment.paymentMethod).replace('_', ' ')}
                    <span className="ml-2 text-xs text-gray-400">
                      {formatTime(payment.createdAt)}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-emerald-600">
                    {formatMoney(payment.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
