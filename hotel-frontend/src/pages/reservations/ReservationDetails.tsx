import { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  getReservationById,
  confirmReservation,
  cancelReservationByStaff,
  checkInReservation,
} from '../../services/reservationService';
import { getRoomById } from '../../services/roomService';
import { getInvoiceByReservationId } from '../../services/invoiceService';
import type { Reservation, ReservationStatus } from '../../types/reservation';
import type { Room } from '../../types/room';
import type { Invoice } from '../../types/invoice';

type ModalAction = 'CONFIRM' | 'CANCEL' | 'CHECK_IN';

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
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${entry.className}`}
    >
      {entry.label}
    </span>
  );
}

/**
 * One stay, from the desk's point of view.
 *
 * Checkout is deliberately not a button here: it opens the Generate Final Bill
 * screen, where the bill is priced and reviewed before the stay is closed.
 */
export default function ReservationDetails() {
  const { reservationId = '' } = useParams<{ reservationId: string }>();
  const navigate = useNavigate();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [dialogAction, setDialogAction] = useState<ModalAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const loaded = await getReservationById(reservationId);
      setReservation(loaded);

      if (loaded.roomId) {
        setRoom(await getRoomById(loaded.roomId).catch(() => null));
      }

      setInvoice(
        await getInvoiceByReservationId(reservationId).catch(() => null),
      );
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setError('Reservation not found.');
      } else {
        setError(
          err?.response?.data?.message || 'Failed to load reservation details.',
        );
      }
    } finally {
      setLoading(false);
    }
  }, [reservationId]);

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        const loaded = await getReservationById(reservationId);
        if (ignore) return;
        setReservation(loaded);

        if (loaded.roomId) {
          const loadedRoom = await getRoomById(loaded.roomId).catch(() => null);
          if (!ignore) setRoom(loadedRoom);
        }

        const loadedInvoice = await getInvoiceByReservationId(reservationId).catch(
          () => null,
        );
        if (!ignore) setInvoice(loadedInvoice);
      } catch (err: any) {
        if (ignore) return;
        setError(
          err?.response?.status === 404
            ? 'Reservation not found.'
            : err?.response?.data?.message ||
                'Failed to load reservation details.',
        );
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [reservationId]);

  const executeAction = async () => {
    if (!dialogAction || !reservation) return;

    setActionLoading(true);
    setActionError(null);
    setSuccessMsg(null);

    try {
      if (dialogAction === 'CONFIRM') {
        setReservation(await confirmReservation(reservation.reservationId));
        setSuccessMsg('Reservation confirmed. The room is now reserved.');
      } else if (dialogAction === 'CANCEL') {
        setReservation(await cancelReservationByStaff(reservation.reservationId));
        setSuccessMsg('Reservation cancelled.');
      } else {
        setReservation(await checkInReservation(reservation.reservationId));
        setSuccessMsg('Guest checked in. The room is now occupied.');
      }

      setDialogAction(null);
      setInvoice(
        await getInvoiceByReservationId(reservation.reservationId).catch(
          () => null,
        ),
      );
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message ||
          `Failed to perform ${dialogAction.toLowerCase()} operation.`,
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        Loading reservation details…
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800"
        >
          {error || 'Reservation not found.'}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={load}
            className="rounded-lg bg-royal px-4 py-2 text-sm font-semibold text-white hover:bg-royal/90"
          >
            Retry
          </button>
          <Link
            to="/reservations"
            className="text-sm font-semibold text-royal hover:underline"
          >
            ← Back to reservations
          </Link>
        </div>
      </div>
    );
  }

  const nights = nightsBetween(reservation.checkInDate, reservation.checkOutDate);
  const canCheckIn =
    reservation.status === 'CONFIRMED' && room?.status !== 'CLEANING';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to="/reservations"
            className="text-sm font-medium text-royal hover:underline"
          >
            ← Back to reservations
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {reservation.customerName}
            </h1>
            <StatusBadge status={reservation.status} />
          </div>
          <p className="mt-0.5 font-mono text-xs text-gray-500">
            {reservation.reservationId}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {reservation.status === 'PENDING' && (
            <>
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setDialogAction('CONFIRM');
                }}
                className="rounded-md bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setDialogAction('CANCEL');
                }}
                className="rounded-md border border-red-300 bg-white px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                Cancel
              </button>
            </>
          )}

          {reservation.status === 'CONFIRMED' && (
            <>
              <button
                type="button"
                disabled={!canCheckIn}
                title={
                  room?.status === 'CLEANING'
                    ? 'The room is still being cleaned. Check-in is unavailable until housekeeping finishes.'
                    : 'Check this guest in'
                }
                onClick={() => {
                  setActionError(null);
                  setDialogAction('CHECK_IN');
                }}
                className="rounded-md bg-royal px-3.5 py-2 text-xs font-semibold text-white hover:bg-royal/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {room?.status === 'CLEANING' ? 'In cleaning' : 'Check in'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setDialogAction('CANCEL');
                }}
                className="rounded-md border border-red-300 bg-white px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                Cancel
              </button>
            </>
          )}

          {reservation.status === 'CHECKED_IN' && (
            <button
              type="button"
              onClick={() =>
                navigate(`/staff/reservations/${reservation.reservationId}/checkout`)
              }
              className="rounded-md bg-royal px-3.5 py-2 text-xs font-semibold text-white hover:bg-royal/90"
            >
              Check out — generate final bill
            </button>
          )}
        </div>
      </div>

      {successMsg && (
        <div
          role="status"
          className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Occupant & stay ── */}
        <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
          <h2 className="border-b border-gray-100 pb-2 text-base font-bold text-gray-900">
            Occupant &amp; stay
          </h2>

          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Name</dt>
              <dd className="font-semibold text-gray-900">
                {reservation.customerName}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Phone</dt>
              <dd className="text-gray-900">{reservation.customerPhone}</dd>
            </div>
            {reservation.customerEmail && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Email</dt>
                <dd className="break-all text-gray-900">
                  {reservation.customerEmail}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">Guests</dt>
              <dd className="font-semibold text-gray-900">
                {reservation.numberOfGuests}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Check-in</dt>
              <dd className="font-semibold text-gray-900">
                {reservation.checkInDate}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Check-out</dt>
              <dd className="font-semibold text-gray-900">
                {reservation.checkOutDate}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Nights</dt>
              <dd className="text-gray-800">{nights}</dd>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2">
              <dt className="text-gray-500">Booked</dt>
              <dd className="text-xs text-gray-600">
                {reservation.createdAt
                  ? new Date(reservation.createdAt).toLocaleString()
                  : '—'}
              </dd>
            </div>
          </dl>

          {room?.status === 'CLEANING' && reservation.status === 'CONFIRMED' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
              This room is being cleaned. Check-in is disabled until housekeeping
              completes the task.
            </div>
          )}
        </section>

        {/* ── Room & bill ── */}
        <div className="space-y-6">
          <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
            <h2 className="border-b border-gray-100 pb-2 text-base font-bold text-gray-900">
              Room
            </h2>

            {room ? (
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Number</dt>
                  <dd className="font-bold text-gray-900">{room.roomNumber}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Type</dt>
                  <dd className="font-semibold text-gray-800">{room.roomType}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Floor</dt>
                  <dd className="text-gray-800">{room.floor}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Rate per night</dt>
                  <dd className="font-semibold text-gray-900">
                    {formatMoney(room.pricePerNight)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Status</dt>
                  <dd className="font-semibold text-gray-800">{room.status}</dd>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-2 font-bold">
                  <dt className="text-gray-900">Room charge</dt>
                  <dd className="text-royal">
                    {formatMoney(nights * room.pricePerNight)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-gray-500">
                Room <span className="font-mono">{reservation.roomId}</span>
              </p>
            )}
          </section>

          <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
            <h2 className="border-b border-gray-100 pb-2 text-base font-bold text-gray-900">
              Bill
            </h2>

            {invoice ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Invoice</span>
                  <Link
                    to={`/invoices/${invoice.invoiceId}`}
                    className="font-mono text-xs text-royal hover:underline"
                  >
                    {invoice.invoiceId.slice(0, 8)}…
                  </Link>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Room charge</span>
                  <span className="text-gray-900">
                    {formatMoney(invoice.roomCharge)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Additional charges</span>
                  <span className="text-gray-900">
                    {formatMoney(invoice.additionalChargesTotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Discount</span>
                  <span className="text-gray-900">
                    −{formatMoney(invoice.discountAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tax</span>
                  <span className="text-gray-900">
                    {formatMoney(invoice.taxAmount)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-2 font-bold">
                  <span className="text-gray-900">Total</span>
                  <span className="text-gray-900">
                    {formatMoney(invoice.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Paid</span>
                  <span className="font-semibold text-emerald-600">
                    {formatMoney(invoice.paidAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-gray-700">Remaining</span>
                  <span
                    className={
                      (invoice.remainingAmount ?? 0) > 0
                        ? 'text-red-600'
                        : 'text-emerald-600'
                    }
                  >
                    {formatMoney(invoice.remainingAmount)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                {reservation.status === 'CANCELLED'
                  ? 'No bill for a cancelled reservation.'
                  : 'No bill has been opened for this stay.'}
              </p>
            )}
          </section>
        </div>
      </div>

      {/* ── Confirmation dialog ── */}
      {dialogAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-gray-900">
              {dialogAction === 'CONFIRM'
                ? 'Confirm reservation'
                : dialogAction === 'CANCEL'
                  ? 'Cancel reservation'
                  : 'Check in guest'}
            </h3>
            <p className="text-xs text-gray-600">
              {dialogAction === 'CONFIRM' &&
                'Confirm this reservation? Availability is re-checked, the room becomes RESERVED, and the bill is opened.'}
              {dialogAction === 'CANCEL' &&
                'Cancel this reservation? The room is freed up and no further payments can be taken against it.'}
              {dialogAction === 'CHECK_IN' &&
                'Check this guest in? The room becomes OCCUPIED.'}
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
                onClick={() => setDialogAction(null)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Never mind
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={executeAction}
                className={`rounded-md px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 ${
                  dialogAction === 'CANCEL'
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
