import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  getAllReservations,
  confirmReservation,
  cancelReservationByStaff,
  checkInReservation,
  checkOutReservation,
} from '../../services/reservationService';
import { getRooms } from '../../services/roomService';
import type { Reservation, ReservationStatus } from '../../types/reservation';
import type { Room } from '../../types/room';

type FilterTab = 'ALL' | 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED';
type StaffAction = 'CONFIRM' | 'CANCEL' | 'CHECK_IN' | 'CHECK_OUT';

export default function StaffReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter & Search
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Confirmation modal state for staff actions
  const [pendingAction, setPendingAction] = useState<{
    type: StaffAction;
    reservation: Reservation;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const refreshData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [resData, roomData] = await Promise.all([
        getAllReservations(),
        getRooms().catch(() => [] as Room[]),
      ]);
      setReservations(resData);
      setRooms(roomData);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Failed to load reservations. Please ensure backend is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    Promise.all([
      getAllReservations(),
      getRooms().catch(() => [] as Room[]),
    ])
      .then(([resData, roomData]) => {
        if (!ignore) {
          setReservations(resData);
          setRooms(roomData);
        }
      })
      .catch((err: any) => {
        if (!ignore) {
          setError(
            err?.response?.data?.message ||
              'Failed to load reservations. Please ensure backend is running.'
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
    rooms.forEach((r) => map.set(r.roomId, r));
    return map;
  }, [rooms]);

  const calculateNights = (inDate: string, outDate: string): number => {
    const start = new Date(inDate).getTime();
    const end = new Date(outDate).getTime();
    const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  };

  const calculateEstimatedTotal = (res: Reservation): number => {
    const room = roomMap.get(res.roomId);
    if (!room) return 0;
    const nights = calculateNights(res.checkInDate, res.checkOutDate);
    return nights * room.pricePerNight;
  };

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
        setSuccessMsg(
          `Reservation ${reservation.reservationId} confirmed successfully! Room status is RESERVED and invoice has been generated.`
        );
      } else if (type === 'CANCEL') {
        updated = await cancelReservationByStaff(reservation.reservationId);
        setSuccessMsg(
          `Reservation ${reservation.reservationId} has been cancelled by staff.`
        );
      } else if (type === 'CHECK_IN') {
        updated = await checkInReservation(reservation.reservationId);
        setSuccessMsg(
          `Guest for reservation ${reservation.reservationId} has been checked in. Room status is OCCUPIED.`
        );
      } else {
        // CHECK_OUT
        updated = await checkOutReservation(reservation.reservationId);
        setSuccessMsg(
          `Guest checked out. Room status updated to CLEANING and housekeeping task dispatched.`
        );
      }

      setReservations((prev) =>
        prev.map((r) => (r.reservationId === reservation.reservationId ? updated : r))
      );
      setPendingAction(null);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        `Failed to perform ${type.toLowerCase()} action.`;
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const pendingReservations = useMemo(
    () => reservations.filter((r) => r.status === 'PENDING'),
    [reservations]
  );

  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      // Tab filter
      if (activeTab !== 'ALL' && r.status !== activeTab) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = r.reservationId.toLowerCase().includes(q);
        const matchesCustomer = r.customerUid.toLowerCase().includes(q);
        const matchesRoom = r.roomId.toLowerCase().includes(q);
        const room = roomMap.get(r.roomId);
        const matchesRoomNumber = room?.roomNumber?.toString().includes(q);
        return matchesId || matchesCustomer || matchesRoom || Boolean(matchesRoomNumber);
      }

      return true;
    });
  }, [reservations, activeTab, searchQuery, roomMap]);

  const renderStatusBadge = (status: ReservationStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Waiting for confirmation
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Confirmed
          </span>
        );
      case 'CHECKED_IN':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Checked In
          </span>
        );
      case 'CHECKED_OUT':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
            Checked Out
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
            {status}
          </span>
        );
    }
  };

  const getActionBusyText = (type: StaffAction): string => {
    switch (type) {
      case 'CONFIRM':
        return 'Confirming...';
      case 'CANCEL':
        return 'Cancelling...';
      case 'CHECK_IN':
        return 'Checking in...';
      case 'CHECK_OUT':
        return 'Checking out...';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Staff Reservations Management
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Review incoming requests, confirm bookings, manage guest check-ins/outs, and monitor occupancy.
          </p>
        </div>
        <button
          type="button"
          onClick={refreshData}
          disabled={loading || actionLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
        >
          <svg
            className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-600' : 'text-gray-500'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {/* Global Notifications */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800"
        >
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-900 text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {successMsg && (
        <div
          role="alert"
          className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          <div className="flex items-center justify-between">
            <span>{successMsg}</span>
            <button
              type="button"
              onClick={() => setSuccessMsg(null)}
              className="text-emerald-600 hover:text-emerald-900 text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ── 1. PENDING RESERVATIONS SECTION ── */}
      <section className="rounded-xl border border-amber-200 bg-linear-to-r from-amber-50/50 to-orange-50/30 p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-amber-200/70 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-white font-bold">
              !
            </span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Pending Reservations ({pendingReservations.length})
              </h2>
              <p className="text-xs text-gray-600">
                Review and approve customer requests. Confirmation checks availability, reserves room, and generates invoice.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
            Action Required
          </span>
        </div>

        {pendingReservations.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            <svg
              className="mx-auto h-10 w-10 text-gray-400 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            No reservations currently waiting for confirmation.
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pendingReservations.map((res) => {
              const room = roomMap.get(res.roomId);
              const nights = calculateNights(res.checkInDate, res.checkOutDate);
              const estTotal = calculateEstimatedTotal(res);
              const isBusy =
                actionLoading &&
                pendingAction?.reservation.reservationId === res.reservationId;

              return (
                <div
                  key={res.reservationId}
                  className="flex flex-col justify-between rounded-xl border border-amber-200 bg-white p-5 shadow-xs transition hover:shadow-md"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          to={`/staff/reservations/${res.reservationId}`}
                          className="text-xs font-mono text-indigo-600 hover:text-indigo-800 break-all block font-medium"
                        >
                          {res.reservationId}
                        </Link>
                        <h3 className="font-bold text-gray-900 flex items-center gap-1.5 flex-wrap">
                          <span>{room ? `Room ${room.roomNumber} (${room.roomType})` : `Room: ${res.roomId}`}</span>
                          {room?.status === 'CLEANING' && (
                            <span
                              className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
                              title="Room currently undergoing housekeeping cleaning"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Cleaning
                            </span>
                          )}
                        </h3>
                      </div>
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        PENDING
                      </span>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-3 space-y-1.5 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Customer UID:</span>
                        <span className="font-mono text-gray-800 break-all">{res.customerUid}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Dates:</span>
                        <span className="font-medium text-gray-900">
                          {res.checkInDate} &rarr; {res.checkOutDate} ({nights} {nights === 1 ? 'nt' : 'nts'})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Guests:</span>
                        <span className="font-medium text-gray-900">{res.numberOfGuests}</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-200 pt-1.5 font-bold text-gray-900 text-sm">
                        <span>Est. Total:</span>
                        <span className="text-indigo-600">
                          ${estTotal > 0 ? estTotal.toFixed(2) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for PENDING */}
                  <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => {
                        setActionError(null);
                        setPendingAction({ type: 'CONFIRM', reservation: res });
                      }}
                      className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-center text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-50"
                    >
                      {isBusy && pendingAction?.type === 'CONFIRM'
                        ? 'Confirming...'
                        : 'Confirm'}
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => {
                        setActionError(null);
                        setPendingAction({ type: 'CANCEL', reservation: res });
                      }}
                      className="rounded-md border border-red-300 bg-white px-3 py-2 text-center text-xs font-semibold text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                    >
                      {isBusy && pendingAction?.type === 'CANCEL'
                        ? 'Cancelling...'
                        : 'Cancel'}
                    </button>
                    <Link
                      to={`/staff/reservations/${res.reservationId}`}
                      className="rounded-md border border-gray-300 bg-white px-2.5 py-2 text-center text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                      title="View Details"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 2. ALL RESERVATIONS SECTION ── */}
      <section className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-gray-900">All Reservations</h2>

          {/* Search bar */}
          <div className="w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, customer, room..."
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm shadow-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-2">
          {(
            [
              { id: 'ALL', label: 'All' },
              { id: 'PENDING', label: 'Pending' },
              { id: 'CONFIRMED', label: 'Confirmed' },
              { id: 'CHECKED_IN', label: 'Checked In' },
              { id: 'CHECKED_OUT', label: 'Checked Out' },
              { id: 'CANCELLED', label: 'Cancelled' },
            ] as const
          ).map((tab) => {
            const count =
              tab.id === 'ALL'
                ? reservations.length
                : reservations.filter((r) => r.status === tab.id).length;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    activeTab === tab.id
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

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">Reservation ID</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Check-in / Check-out</th>
                  <th className="px-4 py-3 text-center">Guests</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3">Created Date</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white text-xs">
                {filteredReservations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-500">
                      No reservations match your filters.
                    </td>
                  </tr>
                ) : (
                  filteredReservations.map((res) => {
                    const room = roomMap.get(res.roomId);
                    const nights = calculateNights(res.checkInDate, res.checkOutDate);
                    const isBusy =
                      actionLoading &&
                      pendingAction?.reservation.reservationId === res.reservationId;

                    return (
                      <tr key={res.reservationId} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 font-mono font-medium text-gray-900 break-all">
                          <Link
                            to={`/staff/reservations/${res.reservationId}`}
                            className="text-indigo-600 hover:text-indigo-900 font-semibold"
                          >
                            {res.reservationId}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-600 break-all">
                          {res.customerUid}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-900">
                              {room ? `Room ${room.roomNumber}` : res.roomId}
                            </span>
                            {room?.status === 'CLEANING' && (
                              <span
                                className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
                                title="Room currently undergoing housekeeping cleaning"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Cleaning
                              </span>
                            )}
                          </div>
                          {room && (
                            <div className="text-[11px] text-gray-500">{room.roomType}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          <div>
                            {res.checkInDate} &rarr; {res.checkOutDate}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {nights} {nights === 1 ? 'night' : 'nights'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-gray-800">
                          {res.numberOfGuests}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {renderStatusBadge(res.status)}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {res.createdAt
                            ? new Date(res.createdAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* PENDING: Confirm & Cancel */}
                            {res.status === 'PENDING' && (
                              <>
                                <button
                                  type="button"
                                  disabled={actionLoading}
                                  onClick={() => {
                                    setActionError(null);
                                    setPendingAction({ type: 'CONFIRM', reservation: res });
                                  }}
                                  className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50"
                                >
                                  {isBusy && pendingAction?.type === 'CONFIRM'
                                    ? 'Confirming...'
                                    : 'Confirm'}
                                </button>
                                <button
                                  type="button"
                                  disabled={actionLoading}
                                  onClick={() => {
                                    setActionError(null);
                                    setPendingAction({ type: 'CANCEL', reservation: res });
                                  }}
                                  className="rounded-md border border-red-300 bg-white px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                                >
                                  {isBusy && pendingAction?.type === 'CANCEL'
                                    ? 'Cancelling...'
                                    : 'Cancel'}
                                </button>
                              </>
                            )}

                            {/* CONFIRMED: Check In & Cancel */}
                            {res.status === 'CONFIRMED' && (
                              <>
                                <button
                                  type="button"
                                  disabled={actionLoading || room?.status === 'CLEANING'}
                                  onClick={() => {
                                    setActionError(null);
                                    setPendingAction({ type: 'CHECK_IN', reservation: res });
                                  }}
                                  title={
                                    room?.status === 'CLEANING'
                                      ? 'Room is currently being cleaned by housekeeping. Check-in is unavailable until cleaning finishes.'
                                      : 'Check In Guest'
                                  }
                                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                                    room?.status === 'CLEANING'
                                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed border border-gray-300'
                                      : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'
                                  }`}
                                >
                                  {isBusy && pendingAction?.type === 'CHECK_IN'
                                    ? 'Checking in...'
                                    : room?.status === 'CLEANING'
                                    ? 'In Cleaning'
                                    : 'Check In'}
                                </button>
                                <button
                                  type="button"
                                  disabled={actionLoading}
                                  onClick={() => {
                                    setActionError(null);
                                    setPendingAction({ type: 'CANCEL', reservation: res });
                                  }}
                                  className="rounded-md border border-red-300 bg-white px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                                >
                                  {isBusy && pendingAction?.type === 'CANCEL'
                                    ? 'Cancelling...'
                                    : 'Cancel'}
                                </button>
                              </>
                            )}

                            {/* CHECKED_IN: Check Out */}
                            {res.status === 'CHECKED_IN' && (
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => {
                                  setActionError(null);
                                  setPendingAction({ type: 'CHECK_OUT', reservation: res });
                                }}
                                className="rounded-md bg-purple-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-purple-700 transition disabled:opacity-50"
                              >
                                {isBusy && pendingAction?.type === 'CHECK_OUT'
                                  ? 'Checking out...'
                                  : 'Check Out'}
                              </button>
                            )}

                            {/* Details Link */}
                            <Link
                              to={`/staff/reservations/${res.reservationId}`}
                              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
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
      </section>

      {/* ── 3. ACTION CONFIRMATION DIALOG MODAL ── */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  pendingAction.type === 'CONFIRM'
                    ? 'bg-emerald-100 text-emerald-600'
                    : pendingAction.type === 'CANCEL'
                    ? 'bg-red-100 text-red-600'
                    : pendingAction.type === 'CHECK_IN'
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'bg-purple-100 text-purple-600'
                }`}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {pendingAction.type === 'CONFIRM' ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  ) : pendingAction.type === 'CANCEL' ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  )}
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {pendingAction.type === 'CONFIRM'
                    ? 'Confirm Reservation'
                    : pendingAction.type === 'CANCEL'
                    ? 'Cancel Reservation'
                    : pendingAction.type === 'CHECK_IN'
                    ? 'Check In Guest'
                    : 'Check Out Guest'}
                </h3>
                <p className="mt-1 text-xs text-gray-600">
                  {pendingAction.type === 'CONFIRM' &&
                    `Confirm reservation ${pendingAction.reservation.reservationId}? The backend will re-verify availability, mark room as RESERVED, and automatically generate the invoice.`}
                  {pendingAction.type === 'CANCEL' &&
                    `Cancel reservation ${pendingAction.reservation.reservationId}? The room will be freed up and payments will be disabled.`}
                  {pendingAction.type === 'CHECK_IN' &&
                    `Check in guest for reservation ${pendingAction.reservation.reservationId}? The room status will be updated to OCCUPIED.`}
                  {pendingAction.type === 'CHECK_OUT' &&
                    `Check out guest for reservation ${pendingAction.reservation.reservationId}? The room will be scheduled for CLEANING.`}
                </p>
              </div>
            </div>

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
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Nevermind
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleExecutePendingAction}
                className={`rounded-md px-4 py-2 text-xs font-semibold text-white shadow-xs transition disabled:opacity-50 ${
                  pendingAction.type === 'CONFIRM'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : pendingAction.type === 'CANCEL'
                    ? 'bg-red-600 hover:bg-red-700'
                    : pendingAction.type === 'CHECK_IN'
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {actionLoading
                  ? getActionBusyText(pendingAction.type)
                  : `Yes, ${
                      pendingAction.type === 'CONFIRM'
                        ? 'Confirm'
                        : pendingAction.type === 'CANCEL'
                        ? 'Cancel'
                        : pendingAction.type === 'CHECK_IN'
                        ? 'Check In'
                        : 'Check Out'
                    }`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
