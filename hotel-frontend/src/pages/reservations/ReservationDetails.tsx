import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  getReservationById,
  confirmReservation,
  cancelReservationByStaff,
  cancelCustomerReservation,
  checkInReservation,
  checkOutReservation,
} from '../../services/reservationService';
import { getRoomById } from '../../services/roomService';
import { getInvoiceByReservationId } from '../../services/invoiceService';
import { useAuth } from '../../context/AuthContext';
import type { Reservation, ReservationStatus } from '../../types/reservation';
import type { Room } from '../../types/room';
import type { Invoice } from '../../types/invoice';

type ModalAction = 'CONFIRM' | 'CANCEL' | 'CHECK_IN' | 'CHECK_OUT';

export default function ReservationDetails() {
  const { reservationId } = useParams<{ reservationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dialog state
  const [dialogAction, setDialogAction] = useState<ModalAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isStaff =
    user?.role === 'ADMIN' ||
    user?.role === 'MANAGER' ||
    user?.role === 'RECEPTIONIST';

  const isCustomer = user?.role === 'CUSTOMER';

  const refreshReservation = async () => {
    if (!reservationId) return;

    try {
      setLoading(true);
      setError(null);
      const res = await getReservationById(reservationId);
      setReservation(res);

      if (res.roomId) {
        getRoomById(res.roomId)
          .then(setRoom)
          .catch(() => setRoom(null));
      }

      getInvoiceByReservationId(reservationId)
        .then(setInvoice)
        .catch(() => setInvoice(null));
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setError('You are not authorized to view this reservation.');
      } else if (err?.response?.status === 404) {
        setError('Reservation not found.');
      } else {
        setError(
          err?.response?.data?.message || 'Failed to load reservation details.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!reservationId) return;
    let ignore = false;

    // Keyed by reservationId, which we already have, so it runs alongside the
    // reservation instead of nested inside its response handler.
    getInvoiceByReservationId(reservationId)
      .then((inv) => {
        if (!ignore) setInvoice(inv);
      })
      .catch(() => {
        if (!ignore) setInvoice(null);
      });

    getReservationById(reservationId)
      .then((res) => {
        if (ignore) return;
        setReservation(res);

        // Needs res.roomId, so this hop stays nested.
        if (res.roomId) {
          getRoomById(res.roomId)
            .then((r) => {
              if (!ignore) setRoom(r);
            })
            .catch(() => {
              if (!ignore) setRoom(null);
            });
        }
      })
      .catch((err: any) => {
        if (ignore) return;
        if (err?.response?.status === 403) {
          setError('You are not authorized to view this reservation.');
        } else if (err?.response?.status === 404) {
          setError('Reservation not found.');
        } else {
          setError(
            err?.response?.data?.message || 'Failed to load reservation details.'
          );
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [reservationId]);

  const calculateNights = (inDate: string, outDate: string): number => {
    const start = new Date(inDate).getTime();
    const end = new Date(outDate).getTime();
    const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  };

  const executeAction = async () => {
    if (!dialogAction || !reservation) return;

    setActionLoading(true);
    setActionError(null);
    setSuccessMsg(null);

    try {
      let updated: Reservation;
      if (dialogAction === 'CONFIRM') {
        updated = await confirmReservation(reservation.reservationId);
        setSuccessMsg(
          'Reservation confirmed successfully! The invoice has been generated.'
        );
      } else if (dialogAction === 'CANCEL') {
        if (isStaff) {
          updated = await cancelReservationByStaff(reservation.reservationId);
        } else {
          updated = await cancelCustomerReservation(reservation.reservationId);
        }
        setSuccessMsg('Reservation has been cancelled.');
      } else if (dialogAction === 'CHECK_IN') {
        updated = await checkInReservation(reservation.reservationId);
        setSuccessMsg('Guest has been checked in successfully.');
      } else {
        // CHECK_OUT
        updated = await checkOutReservation(reservation.reservationId);
        setSuccessMsg(
          'Guest has been checked out. Housekeeping task has been created.'
        );
      }

      setReservation(updated);
      setDialogAction(null);

      // Refresh invoice if confirmed
      getInvoiceByReservationId(reservation.reservationId)
        .then(setInvoice)
        .catch(() => setInvoice(null));
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        `Failed to perform ${dialogAction.toLowerCase()} operation.`;
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const renderStatusBadge = (status: ReservationStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Waiting for confirmation
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Confirmed
          </span>
        );
      case 'CHECKED_IN':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {isCustomer ? 'Current stay' : 'Checked In'}
          </span>
        );
      case 'CHECKED_OUT':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
            <span className="h-2 w-2 rounded-full bg-gray-400" />
            {isCustomer ? 'Completed' : 'Checked Out'}
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500">
        Loading reservation details...
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
            onClick={refreshReservation}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-800"
          >
            &larr; Back
          </button>
        </div>
      </div>
    );
  }

  const nights = calculateNights(reservation.checkInDate, reservation.checkOutDate);
  const estimatedTotal = room ? (nights * room.pricePerNight).toFixed(2) : 'N/A';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back Link & Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            &larr; Back to Reservations
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Reservation Details
            </h1>
            {renderStatusBadge(reservation.status)}
          </div>
          <p className="font-mono text-xs text-gray-500 mt-0.5">
            ID: {reservation.reservationId}
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Staff actions */}
          {isStaff && reservation.status === 'PENDING' && (
            <>
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setDialogAction('CONFIRM');
                }}
                className="rounded-md bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
              >
                Confirm Reservation
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setDialogAction('CANCEL');
                }}
                className="rounded-md border border-red-300 bg-white px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
              >
                Cancel Reservation
              </button>
            </>
          )}

          {isStaff && reservation.status === 'CONFIRMED' && (
            <>
              <button
                type="button"
                disabled={room?.status === 'CLEANING'}
                onClick={() => {
                  setActionError(null);
                  setDialogAction('CHECK_IN');
                }}
                title={
                  room?.status === 'CLEANING'
                    ? 'Room is currently undergoing housekeeping cleaning. Check-in unavailable.'
                    : 'Check In Guest'
                }
                className={`rounded-md px-3.5 py-2 text-xs font-semibold shadow-xs transition ${
                  room?.status === 'CLEANING'
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed border border-gray-300'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {room?.status === 'CLEANING' ? 'In Cleaning (Check-in Disabled)' : 'Check In Guest'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setDialogAction('CANCEL');
                }}
                className="rounded-md border border-red-300 bg-white px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
              >
                Cancel Reservation
              </button>
            </>
          )}

          {isStaff && reservation.status === 'CHECKED_IN' && (
            <button
              type="button"
              onClick={() => {
                setActionError(null);
                setDialogAction('CHECK_OUT');
              }}
              className="rounded-md bg-purple-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-purple-700 transition"
            >
              Check Out Guest
            </button>
          )}

          {/* Customer actions */}
          {isCustomer && reservation.status === 'CONFIRMED' && invoice && (
            <Link
              to={`/customer/payments/new?invoiceId=${invoice.invoiceId}`}
              className="rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
            >
              Pay Now (${(invoice.remainingAmount ?? invoice.totalAmount ?? 0).toFixed(2)}) &rarr;
            </Link>
          )}

          {isCustomer &&
            (reservation.status === 'PENDING' || reservation.status === 'CONFIRMED') && (
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setDialogAction('CANCEL');
                }}
                className="rounded-md border border-red-300 bg-white px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
              >
                Cancel Reservation
              </button>
            )}
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div
          role="alert"
          className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {successMsg}
        </div>
      )}

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Customer & Stay Information */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2">
              Stay & Guest Details
            </h2>

            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Customer UID</dt>
                <dd className="font-mono text-gray-900 text-xs break-all">
                  {reservation.customerUid}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Number of Guests</dt>
                <dd className="font-semibold text-gray-900">
                  {reservation.numberOfGuests} {reservation.numberOfGuests === 1 ? 'guest' : 'guests'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Check-in Date</dt>
                <dd className="font-semibold text-gray-900">{reservation.checkInDate}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Check-out Date</dt>
                <dd className="font-semibold text-gray-900">{reservation.checkOutDate}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Duration</dt>
                <dd className="font-medium text-gray-800">
                  {nights} {nights === 1 ? 'night' : 'nights'}
                </dd>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2">
                <dt className="text-gray-500">Created Date</dt>
                <dd className="text-xs text-gray-600">
                  {reservation.createdAt
                    ? new Date(reservation.createdAt).toLocaleString()
                    : 'N/A'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Pending Status Alert */}
          {reservation.status === 'PENDING' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white text-xs">
                  !
                </span>
                Waiting for Staff Confirmation
              </div>
              <p className="text-xs text-amber-800">
                {isStaff
                  ? 'This reservation requires staff confirmation. Clicking "Confirm" will re-verify room availability, set the room to RESERVED, and automatically generate the invoice.'
                  : 'Your booking is currently awaiting staff confirmation. Once confirmed by our team, your invoice will be generated and you will be able to complete payment.'}
              </p>
            </div>
          )}

          {/* Cleaning Status Alert */}
          {room?.status === 'CLEANING' && reservation.status === 'CONFIRMED' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-5 text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white text-xs">
                  !
                </span>
                Room is Currently Being Cleaned
              </div>
              <p className="text-xs text-amber-800">
                This room is currently undergoing housekeeping cleaning. Guest check-in is temporarily disabled until housekeeping completes the cleaning task.
              </p>
            </div>
          )}
        </div>

        {/* Room & Billing Information */}
        <div className="space-y-6">
          {/* Room Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2">
              Room Information
            </h2>

            {room ? (
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Room Number</dt>
                  <dd className="font-bold text-gray-900">Room {room.roomNumber}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Room Status</dt>
                  <dd>
                    {room.status === 'CLEANING' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Cleaning in progress
                      </span>
                    ) : (
                      <span className="font-semibold text-gray-800">{room.status}</span>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Room Type</dt>
                  <dd className="font-semibold text-indigo-700">{room.roomType}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Floor</dt>
                  <dd className="text-gray-800">Floor {room.floor}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Rate per Night</dt>
                  <dd className="font-semibold text-gray-900">${room.pricePerNight}</dd>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-2 font-bold">
                  <dt className="text-gray-900">Estimated Total</dt>
                  <dd className="text-indigo-600">${estimatedTotal}</dd>
                </div>
              </dl>
            ) : (
              <div className="text-sm text-gray-500">
                Room ID: <span className="font-mono">{reservation.roomId}</span>
              </div>
            )}
          </div>

          {/* Invoice & Payment Information Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h2 className="text-base font-bold text-gray-900">
                Invoice & Billing Information
              </h2>
              {invoice && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    invoice.status === 'PAID'
                      ? 'bg-emerald-100 text-emerald-800'
                      : invoice.status === 'PARTIALLY_PAID'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {invoice.status}
                </span>
              )}
            </div>

            {invoice ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Invoice ID</span>
                  <Link
                    to={isStaff ? `/invoices` : `/customer/invoices/${invoice.invoiceId}`}
                    className="font-mono text-xs text-indigo-600 hover:text-indigo-800 break-all"
                  >
                    {invoice.invoiceId}
                  </Link>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Room Charge</span>
                  <span className="text-gray-900">${(invoice.roomCharge ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Additional Charges</span>
                  <span className="text-gray-900">
                    ${(invoice.additionalCharges ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Discount</span>
                  <span className="text-emerald-600">
                    -${(invoice.discount ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-2 font-bold">
                  <span className="text-gray-900">Total Billed</span>
                  <span className="text-gray-900">${(invoice.totalAmount ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Amount Paid</span>
                  <span className="font-semibold text-emerald-600">
                    ${(invoice.paidAmount ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-gray-700">Remaining Balance</span>
                  <span
                    className={
                      (invoice.remainingAmount ?? 0) > 0 ? 'text-red-600' : 'text-emerald-600'
                    }
                  >
                    ${(invoice.remainingAmount ?? 0).toFixed(2)}
                  </span>
                </div>

                {isCustomer && (invoice.remainingAmount ?? 0) > 0 && (
                  <div className="pt-2">
                    <Link
                      to={`/customer/payments/new?invoiceId=${invoice.invoiceId}`}
                      className="block w-full rounded-md bg-indigo-600 px-4 py-2 text-center text-xs font-semibold text-white hover:bg-indigo-700 transition"
                    >
                      Pay Outstanding Balance &rarr;
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-gray-500">
                {reservation.status === 'PENDING'
                  ? 'Invoice will be automatically generated upon staff confirmation.'
                  : reservation.status === 'CANCELLED'
                  ? 'No invoice generated for cancelled reservation.'
                  : 'No invoice found for this reservation.'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── ACTION CONFIRMATION MODAL DIALOG ── */}
      {dialogAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  dialogAction === 'CONFIRM'
                    ? 'bg-emerald-100 text-emerald-600'
                    : dialogAction === 'CANCEL'
                    ? 'bg-red-100 text-red-600'
                    : dialogAction === 'CHECK_IN'
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'bg-purple-100 text-purple-600'
                }`}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {dialogAction === 'CONFIRM' ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  ) : dialogAction === 'CANCEL' ? (
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
                  {dialogAction === 'CONFIRM'
                    ? 'Confirm Reservation'
                    : dialogAction === 'CANCEL'
                    ? 'Cancel Reservation'
                    : dialogAction === 'CHECK_IN'
                    ? 'Check In Guest'
                    : 'Check Out Guest'}
                </h3>
                <p className="mt-1 text-xs text-gray-600">
                  {dialogAction === 'CONFIRM' &&
                    'Are you sure you want to confirm this reservation? The backend will re-verify room availability, set the room to RESERVED, and automatically generate the customer invoice.'}
                  {dialogAction === 'CANCEL' &&
                    'Are you sure you want to cancel this reservation? The room will be freed up and payments will be disabled.'}
                  {dialogAction === 'CHECK_IN' &&
                    'Confirm check-in for this guest? The room status will be updated to OCCUPIED.'}
                  {dialogAction === 'CHECK_OUT' &&
                    'Confirm check-out for this guest? The room will be scheduled for CLEANING and a housekeeping task will be created.'}
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
                onClick={() => setDialogAction(null)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Nevermind
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={executeAction}
                className={`rounded-md px-4 py-2 text-xs font-semibold text-white shadow-xs transition disabled:opacity-50 ${
                  dialogAction === 'CONFIRM'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : dialogAction === 'CANCEL'
                    ? 'bg-red-600 hover:bg-red-700'
                    : dialogAction === 'CHECK_IN'
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {actionLoading
                  ? dialogAction === 'CONFIRM'
                    ? 'Confirming...'
                    : dialogAction === 'CANCEL'
                    ? 'Cancelling...'
                    : dialogAction === 'CHECK_IN'
                    ? 'Checking in...'
                    : 'Checking out...'
                  : `Yes, ${
                      dialogAction === 'CONFIRM'
                        ? 'Confirm'
                        : dialogAction === 'CANCEL'
                        ? 'Cancel'
                        : dialogAction === 'CHECK_IN'
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
