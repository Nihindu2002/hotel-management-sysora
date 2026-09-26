import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getAllReservations,
  confirmReservation,
  cancelReservationByStaff,
  checkInReservation,
} from '../../services/reservationService';
import { getRooms } from '../../services/roomService';
import type { Reservation, ReservationStatus } from '../../types/reservation';
import type { Room } from '../../types/room';

type FilterTab = 'ALL' | ReservationStatus;
type StaffAction = 'CONFIRM' | 'CANCEL' | 'CHECK_IN';

function formatMoney(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(`${checkIn}T00:00:00`).getTime();
  const end = new Date(`${checkOut}T00:00:00`).getTime();
  return Math.max(1, Math.round((end - start) / 86_400_000));
}

function StatusBadge({ status }: { status: ReservationStatus }) {
  const map: Record<ReservationStatus, { label: string; className: string }> = {
    PENDING: { label: 'Pending', className: 'bg-amber-100 text-amber-800' },
    CONFIRMED: { label: 'Confirmed', className: 'bg-blue-100 text-blue-800' },
    CHECKED_IN: { label: 'Checked in', className: 'bg-emerald-100 text-emerald-800' },
    CHECKED_OUT: { label: 'Checked out', className: 'bg-gray-100 text-gray-700' },
    CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-800' },
  };

  const entry = map[status] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-700',
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${entry.className}`}
    >
      {entry.label}
    </span>
  );
}

/**
 * The front desk's reservation list.
 *
 * Booking starts here and ends at the checkout screen; check-out is a link
 * rather than an action because the bill has to be generated and reviewed
 * first.
 */
export default function StaffReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [pendingAction, setPendingAction] = useState<{
    type: StaffAction;
    reservation: Reservation;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);

    return Promise.all([
      getAllReservations(),
      getRooms().catch(() => [] as Room[]),
    ])
      .then(([reservationsData, roomsData]) => {
        setReservations(reservationsData);
        setRooms(roomsData);
      })
      .catch((err: any) => {
        setError(
          err?.response?.data?.message ||
            'Failed to load reservations. Please ensure the backend is running.',
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let ignore = false;

    Promise.all([getAllReservations(), getRooms().catch(() => [] as Room[])])
      .then(([reservationsData, roomsData]) => {
        if (!ignore) {
          setReservations(reservationsData);
          setRooms(roomsData);
        }
      })
      .catch((err: any) => {
        if (!ignore) {
          setError(
            err?.response?.data?.message ||
              'Failed to load reservations. Please ensure the backend is running.',
          );
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const roomMap = useMemo(() => {
    const map = new Map<string, Room>();
    rooms.forEach((room) => map.set(room.roomId, room));
    return map;
  }, [rooms]);

  const handleExecutePendingAction = async () => {
    if (!pendingAction) return;

    const { type, reservation } = pendingAction;
    setActionLoading(true);
    setActionError(null);
    setSuccessMsg(null);

    try {
      let updated: Reservation;

      if (type === 'CONFIRM') {
        updated = await confirmReservation(reservation.reservationId);
        setSuccessMsg('Reservation confirmed.');
      } else if (type === 'CANCEL') {
        updated = await cancelReservationByStaff(reservation.reservationId);
        setSuccessMsg('Reservation cancelled.');
      } else {
        updated = await checkInReservation(reservation.reservationId);
        setSuccessMsg('Guest checked in. The room is now occupied.');
      }

      setReservations((prev) =>
        prev.map((r) => (r.reservationId === reservation.reservationId ? updated : r)),
      );
      setPendingAction(null);
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          `Failed to perform ${type.toLowerCase()} action.`,
      );
    } finally {
      setActionLoading(false);
    }
  };

  const filteredReservations = useMemo(() => {
    return reservations.filter((reservation) => {
      if (activeTab !== 'ALL' && reservation.status !== activeTab) {
        return false;
      }

      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase();
      const room = roomMap.get(reservation.roomId);

      return (
        reservation.reservationId.toLowerCase().includes(query) ||
        reservation.customerName.toLowerCase().includes(query) ||
        reservation.customerPhone.toLowerCase().includes(query) ||
        Boolean(room?.roomNumber?.toLowerCase().includes(query))
      );
    });
  }, [reservations, activeTab, searchQuery, roomMap]);

  const today = new Date().toISOString().slice(0, 10);
  const arrivalsToday = reservations.filter(
    (r) => r.checkInDate === today && r.status !== 'CANCELLED',
  );
  const departuresToday = reservations.filter(
    (r) => r.checkOutDate === today && r.status !== 'CANCELLED',
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Reservations
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {arrivalsToday.length} arriving today · {departuresToday.length}{' '}
            departing today
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Refresh
          </button>
          <Link
            to="/reservations/new"
            className="rounded-lg bg-royal px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-royal/90"
          >
            + New reservation
          </Link>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}
      {successMsg && (
        <div role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
          {successMsg}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-2">
          {(
            [
              'ALL',
              'CONFIRMED',
              'CHECKED_IN',
              'CHECKED_OUT',
              'PENDING',
              'CANCELLED',
            ] as const
          ).map((tab) => {
            const count =
              tab === 'ALL'
                ? reservations.length
                : reservations.filter((r) => r.status === tab).length;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  activeTab === tab
                    ? 'bg-royal text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{tab === 'ALL' ? 'All' : tab.replace('_', ' ')}</span>
                <span
                  className={`rounded-full px-1.5 text-[10px] ${
                    activeTab === tab
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search guest, phone, room…"
          className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-royal focus:ring-2 focus:ring-royal/20 focus:outline-hidden sm:w-72"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Guest</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3">Stay</th>
                <th className="px-4 py-3 text-center">Guests</th>
                <th className="px-4 py-3 text-right">Room charge</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : filteredReservations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    No reservations match your filters.
                  </td>
                </tr>
              ) : (
                filteredReservations.map((reservation) => {
                  const room = roomMap.get(reservation.roomId);
                  const nights = nightsBetween(
                    reservation.checkInDate,
                    reservation.checkOutDate,
                  );
                  const charge = room ? nights * room.pricePerNight : null;
                  const isBusy =
                    actionLoading &&
                    pendingAction?.reservation.reservationId ===
                      reservation.reservationId;

                  return (
                    <tr key={reservation.reservationId} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          to={`/staff/reservations/${reservation.reservationId}`}
                          className="font-semibold text-royal hover:underline"
                        >
                          {reservation.customerName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {reservation.customerPhone}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-900">
                          {room ? `Room ${room.roomNumber}` : reservation.roomId}
                        </span>
                        {room?.status === 'CLEANING' && (
                          <span className="ml-1.5 inline-flex rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                            Cleaning
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                        <div>
                          {reservation.checkInDate} → {reservation.checkOutDate}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {nights} {nights === 1 ? 'night' : 'nights'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-gray-800">
                        {reservation.numberOfGuests}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900">
                        {charge === null ? '—' : formatMoney(charge)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={reservation.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {reservation.status === 'PENDING' && (
                            <>
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => {
                                  setActionError(null);
                                  setPendingAction({ type: 'CONFIRM', reservation });
                                }}
                                className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                {isBusy && pendingAction?.type === 'CONFIRM'
                                  ? 'Confirming…'
                                  : 'Confirm'}
                              </button>
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => {
                                  setActionError(null);
                                  setPendingAction({ type: 'CANCEL', reservation });
                                }}
                                className="rounded-md border border-red-300 bg-white px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {reservation.status === 'CONFIRMED' && (
                            <>
                              <button
                                type="button"
                                disabled={actionLoading || room?.status === 'CLEANING'}
                                title={
                                  room?.status === 'CLEANING'
                                    ? 'The room is being cleaned. Check-in is unavailable until housekeeping finishes.'
                                    : 'Check this guest in'
                                }
                                onClick={() => {
                                  setActionError(null);
                                  setPendingAction({ type: 'CHECK_IN', reservation });
                                }}
                                className="rounded-md bg-royal px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-royal/90 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isBusy && pendingAction?.type === 'CHECK_IN'
                                  ? 'Checking in…'
                                  : room?.status === 'CLEANING'
                                    ? 'In cleaning'
                                    : 'Check in'}
                              </button>
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => {
                                  setActionError(null);
                                  setPendingAction({ type: 'CANCEL', reservation });
                                }}
                                className="rounded-md border border-red-300 bg-white px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {reservation.status === 'CHECKED_IN' && (
                            <Link
                              to={`/staff/reservations/${reservation.reservationId}/checkout`}
                              className="rounded-md bg-royal px-2.5 py-1 text-xs font-semibold text-white hover:bg-royal/90"
                            >
                              Check out
                            </Link>
                          )}

                          <Link
                            to={`/staff/reservations/${reservation.reservationId}`}
                            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                          >
                            Details
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-gray-900">
              {pendingAction.type === 'CONFIRM'
                ? 'Confirm reservation'
                : pendingAction.type === 'CANCEL'
                  ? 'Cancel reservation'
                  : 'Check in guest'}
            </h3>
            <p className="text-xs text-gray-600">
              {pendingAction.type === 'CONFIRM' &&
                `Confirm the reservation for ${pendingAction.reservation.customerName}? Availability is re-checked, the room becomes RESERVED, and the bill is opened.`}
              {pendingAction.type === 'CANCEL' &&
                `Cancel the reservation for ${pendingAction.reservation.customerName}? The room is freed up and no further payments can be taken.`}
              {pendingAction.type === 'CHECK_IN' &&
                `Check in ${pendingAction.reservation.customerName}? The room becomes OCCUPIED.`}
            </p>

            {actionError && (
              <div className="rounded-md bg-red-50 p-3 text-xs text-red-700">
                {actionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setPendingAction(null)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Never mind
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleExecutePendingAction}
                className={`rounded-md px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 ${
                  pendingAction.type === 'CANCEL'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-royal hover:bg-royal/90'
                }`}
              >
                {actionLoading ? 'Working…' : 'Yes, continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
