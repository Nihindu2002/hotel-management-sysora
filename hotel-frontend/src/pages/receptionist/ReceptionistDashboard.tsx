import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getReservationActivity, getRoomStatistics } from '../../services/dashboardService';
import { ROOM_STATUS_META } from '../dashboard/dashboardMeta';
import type { ReservationActivity, RoomStatistics } from '../../types/dashboard';

interface Card {
  label: string;
  value: string;
  hint: string;
  tone: string;
  chip: string;
  icon: string;
  to: string;
}

export default function ReceptionistDashboard() {
  const [activity, setActivity] = useState<ReservationActivity | null>(null);
  const [rooms, setRooms] = useState<RoomStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);

      // Both endpoints are narrowed to include RECEPTIONIST, so this dashboard
      // never has to derive a count from a list it fetched.
      const [activityData, roomData] = await Promise.all([
        getReservationActivity(),
        getRoomStatistics(),
      ]);

      setActivity(activityData);
      setRooms(roomData);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load your dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const cards: Card[] = [
    {
      label: "Today's Arrivals",
      value: (activity?.todayArrivals ?? 0).toString(),
      hint: 'Guests checking in today',
      tone: 'text-emerald-600',
      chip: 'bg-emerald-50 text-emerald-600',
      to: '/reservations',
      icon: 'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75',
    },
    {
      label: "Today's Departures",
      value: (activity?.todayDepartures ?? 0).toString(),
      hint: 'Guests checking out today',
      tone: 'text-sky-600',
      chip: 'bg-sky-50 text-sky-600',
      to: '/reservations',
      icon: 'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H3',
    },
    {
      label: 'Pending Reservations',
      value: (activity?.pendingReservations ?? 0).toString(),
      hint: 'Awaiting confirmation',
      tone: 'text-amber-600',
      chip: 'bg-amber-50 text-amber-600',
      to: '/reservations',
      icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
      label: 'Available Rooms',
      value: (rooms?.availableRooms ?? 0).toString(),
      hint: `of ${rooms?.totalRooms ?? 0} rooms ready now`,
      tone: 'text-indigo-600',
      chip: 'bg-indigo-50 text-indigo-600',
      to: '/rooms',
      icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75',
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
            Today's front-desk movement and live room availability.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {loading && (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
          )}
          <Link
            to="/reservations"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            Manage Reservations
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Room availability */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Room Availability</h2>
              <p className="text-xs text-gray-500">Current status of every room</p>
            </div>
            <Link to="/receptionist/rooms" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              View rooms →
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500">Loading…</div>
          ) : roomCounts.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">No rooms configured yet.</div>
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

        {/* Today's movement */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">Today at a Glance</h2>
            <p className="text-xs text-gray-500">Arrivals, departures, and in-house guests</p>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500">Loading…</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">Booked today</p>
                <p className="text-xl font-bold text-gray-900">
                  {activity?.todayReservations ?? 0}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">Currently checked in</p>
                <p className="text-xl font-bold text-gray-900">
                  {activity?.currentlyCheckedIn ?? 0}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">Confirmed upcoming</p>
                <p className="text-xl font-bold text-gray-900">
                  {activity?.confirmedReservations ?? 0}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">Available now</p>
                <p className="text-xl font-bold text-gray-900">
                  {rooms?.availableRooms ?? 0}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
