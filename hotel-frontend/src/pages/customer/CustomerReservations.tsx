import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getMyReservations,
  cancelCustomerReservation,
} from '../../services/reservationService';
import type { Reservation } from '../../types/reservation';

const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function CustomerReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Cancellation modal state
  const [reservationToCancel, setReservationToCancel] = useState<Reservation | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const todayStr = getTodayDateString();

  const loadReservations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMyReservations();
      setReservations(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Unable to load your reservations. Please try again later.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    getMyReservations()
      .then((data) => {
        if (!ignore) setReservations(data);
      })
      .catch((err: any) => {
        if (!ignore) {
          setError(
            err?.response?.data?.message ||
              'Unable to load your reservations. Please try again later.'
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

  const handleConfirmCancel = async () => {
    if (!reservationToCancel) return;

    setCancelling(true);
    setCancelError(null);

    try {
      await cancelCustomerReservation(reservationToCancel.reservationId);
      setSuccessMessage(
        `Reservation ${reservationToCancel.reservationId} has been successfully cancelled.`
      );
      setReservationToCancel(null);
      await loadReservations();
    } catch (err: any) {
      setCancelError(
        err?.response?.data?.message ||
          'Failed to cancel the reservation. Please try again.'
      );
    } finally {
      setCancelling(false);
    }
  };

  // Grouping reservations
  const cancelledReservations = reservations.filter(
    (r) => r.status === 'CANCELLED'
  );

  const currentReservations = reservations.filter(
    (r) =>
      r.status === 'CHECKED_IN' ||
      (r.status === 'CONFIRMED' &&
        r.checkInDate <= todayStr &&
        r.checkOutDate >= todayStr)
  );

  const upcomingReservations = reservations.filter(
    (r) =>
      (r.status === 'CONFIRMED' || r.status === 'PENDING') &&
      r.checkInDate > todayStr
  );

  const pastReservations = reservations.filter(
    (r) =>
      r.status === 'CHECKED_OUT' ||
      (r.checkOutDate < todayStr &&
        r.status !== 'CANCELLED' &&
        r.status !== 'CHECKED_IN')
  );

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Confirmed
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Waiting for confirmation
          </span>
        );
      case 'CHECKED_IN':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Current stay
          </span>
        );
      case 'CHECKED_OUT':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
            Completed
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

  const renderReservationCard = (res: Reservation) => {
    const isCancellable =
      res.status === 'PENDING' || res.status === 'CONFIRMED';
    const isConfirmed = res.status === 'CONFIRMED';
    const isPending = res.status === 'PENDING';

    return (
      <div
        key={res.reservationId}
        className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-xs transition hover:shadow-sm space-y-4"
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-gray-900">Room ID: {res.roomId}</h3>
              <Link
                to={`/reservations/${res.reservationId}`}
                className="text-xs font-mono text-indigo-600 hover:text-indigo-800 break-all block"
              >
                ID: {res.reservationId}
              </Link>
            </div>
            {renderStatusBadge(res.status)}
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
            <div>
              <span className="text-xs text-gray-400 block">Check-in</span>
              <span className="font-medium text-gray-800">{res.checkInDate}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Check-out</span>
              <span className="font-medium text-gray-800">{res.checkOutDate}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Guests</span>
              <span className="font-medium text-gray-800">
                {res.numberOfGuests} {res.numberOfGuests === 1 ? 'guest' : 'guests'}
              </span>
            </div>
          </div>

          {/* Pending helper note */}
          {isPending && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
              <span className="font-semibold">Awaiting Staff Approval:</span> Your booking is under review by hotel staff. Invoices and payments will become available once confirmed.
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-2 border-t border-gray-100 pt-3">
          {isConfirmed && (
            <Link
              to="/customer/invoices"
              className="block w-full rounded-md bg-indigo-600 px-3 py-1.5 text-center text-xs font-semibold text-white hover:bg-indigo-700 transition"
            >
              View Invoice & Pay &rarr;
            </Link>
          )}

          {isCancellable && (
            <button
              type="button"
              onClick={() => {
                setCancelError(null);
                setReservationToCancel(res);
              }}
              className="w-full rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition focus:ring-2 focus:ring-red-400 focus:outline-hidden"
            >
              Cancel Reservation
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderSection = (
    title: string,
    items: Reservation[],
    emptyMessage: string
  ) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(renderReservationCard)}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Reservations</h1>
          <p className="text-sm text-gray-600">
            View and manage your upcoming, current, past, and cancelled stays.
          </p>
        </div>
        <Link
          to="/customer"
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
        >
          + Book New Room
        </Link>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div
          role="status"
          className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          <div className="flex items-center justify-between">
            <p>{successMessage}</p>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-600 hover:text-emerald-900 font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800"
        >
          <p>{error}</p>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500">
          Loading your reservations...
        </div>
      ) : (
        <div className="space-y-8">
          {/* Current Reservation */}
          {renderSection(
            'Current Stay',
            currentReservations,
            'You do not have any active stays today.'
          )}

          {/* Upcoming Reservations */}
          {renderSection(
            'Upcoming Reservations',
            upcomingReservations,
            'No upcoming reservations found.'
          )}

          {/* Past Reservations */}
          {renderSection(
            'Past Reservations',
            pastReservations,
            'No past reservations to display.'
          )}

          {/* Cancelled Reservations */}
          {renderSection(
            'Cancelled Reservations',
            cancelledReservations,
            'No cancelled reservations.'
          )}
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {reservationToCancel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">
              Cancel Reservation?
            </h3>
            <p className="text-sm text-gray-600">
              Are you sure you want to cancel your reservation for Room{' '}
              <strong className="text-gray-900">{reservationToCancel.roomId}</strong> from{' '}
              <strong className="text-gray-900">{reservationToCancel.checkInDate}</strong> to{' '}
              <strong className="text-gray-900">{reservationToCancel.checkOutDate}</strong>?
            </p>
            <p className="text-xs text-red-600">
              This action cannot be undone once confirmed.
            </p>

            {cancelError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {cancelError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setReservationToCancel(null)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Keep Reservation
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleConfirmCancel}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition"
              >
                {cancelling ? 'Cancelling...' : 'Yes, Cancel Reservation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
