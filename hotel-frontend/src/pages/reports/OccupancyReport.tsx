import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOccupancyReport, getRoomStatistics } from '../../services/dashboardService';
import { ROOM_STATUS_META } from '../dashboard/dashboardMeta';
import type { OccupancyReport as OccupancyReportData, RoomStatistics } from '../../types/dashboard';
import type { RoomStatus } from '../../types/room';

export default function OccupancyReport() {
  const [occupancy, setOccupancy] = useState<OccupancyReportData | null>(null);
  const [rooms, setRooms] = useState<RoomStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);

      // Occupancy is the state of the property right now, so neither endpoint
      // takes a date range — and this page deliberately shows no range picker
      // rather than one that would silently do nothing.
      const [occupancyData, roomData] = await Promise.all([
        getOccupancyReport(),
        getRoomStatistics(),
      ]);

      setOccupancy(occupancyData);
      setRooms(roomData);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load the occupancy report.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const roomRows = useMemo(() => {
    if (!rooms) return [] as { status: RoomStatus; count: number }[];
    return [
      { status: 'AVAILABLE' as RoomStatus, count: rooms.availableRooms },
      { status: 'RESERVED' as RoomStatus, count: rooms.reservedRooms },
      { status: 'OCCUPIED' as RoomStatus, count: rooms.occupiedRooms },
      { status: 'CLEANING' as RoomStatus, count: rooms.cleaningRooms },
      { status: 'MAINTENANCE' as RoomStatus, count: rooms.maintenanceRooms },
    ];
  }, [rooms]);

  const cards = [
    {
      label: 'Total Rooms',
      value: (occupancy?.totalRooms ?? 0).toString(),
      hint: 'Rooms on the property',
      tone: 'text-gray-600',
      chip: 'bg-gray-100 text-gray-600',
    },
    {
      label: 'Occupied Rooms',
      value: (occupancy?.occupiedRooms ?? 0).toString(),
      hint: 'Currently hosting guests',
      tone: 'text-indigo-600',
      chip: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: 'Available Rooms',
      value: (rooms?.availableRooms ?? 0).toString(),
      hint: 'Ready to sell right now',
      tone: 'text-emerald-600',
      chip: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Reserved Rooms',
      value: (rooms?.reservedRooms ?? 0).toString(),
      hint: 'Held for upcoming stays',
      tone: 'text-blue-600',
      chip: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Cleaning Rooms',
      value: (rooms?.cleaningRooms ?? 0).toString(),
      hint: 'With housekeeping',
      tone: 'text-amber-600',
      chip: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Maintenance Rooms',
      value: (rooms?.maintenanceRooms ?? 0).toString(),
      hint: 'Out of service',
      tone: 'text-red-600',
      chip: 'bg-red-50 text-red-600',
    },
  ];

  const rate = occupancy?.occupancyRate ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link to="/reports" className="hover:text-gray-700">
            Reports
          </Link>
          <span>/</span>
          <span className="text-gray-900">Occupancy</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">Occupancy Report</h1>
        <p className="mt-0.5 text-sm text-gray-600">
          Room availability and occupancy rate across the property.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
        Occupancy reflects the current state of the property, so this report has no
        date filter. Use the revenue or expense reports for date-ranged figures.
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Occupancy rate */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
              Occupancy Rate
            </p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {loading ? '—' : `${rate.toFixed(2)}%`}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {occupancy
                ? `${occupancy.occupiedRooms} of ${occupancy.totalRooms} rooms occupied`
                : 'Calculated by the backend'}
            </p>
          </div>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all"
            style={{ width: `${Math.min(rate, 100)}%` }}
          />
        </div>
      </div>

      {/* Counts */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <span className={`text-xs font-semibold uppercase tracking-wider ${card.tone}`}>
              {card.label}
            </span>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {loading ? '—' : card.value}
            </p>
            <p className="mt-1 text-xs text-gray-500">{card.hint}</p>
          </div>
        ))}
      </div>

      {/* Status breakdown */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">Rooms by Status</h2>
        <p className="mb-4 text-xs text-gray-500">
          Every room on the property, by its current state
        </p>

        {loading ? (
          <div className="py-8 text-center text-sm text-gray-500">Loading…</div>
        ) : !rooms || rooms.totalRooms === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">No rooms configured yet.</div>
        ) : (
          <ul className="space-y-3">
            {roomRows.map(({ status, count }) => {
              const meta = ROOM_STATUS_META[status];
              const share = (count / rooms.totalRooms) * 100;

              return (
                <li key={status}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-800">{meta.label}</span>
                    <span className="text-gray-600">
                      <strong className="text-gray-900">{count}</strong> ·{' '}
                      {share.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${share}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
