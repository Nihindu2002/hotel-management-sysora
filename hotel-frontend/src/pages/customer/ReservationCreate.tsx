import React, { useEffect, useState } from 'react';
import { useLocation, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { getRoomById } from '../../services/roomService';
import { createReservation } from '../../services/reservationService';
import type { Room } from '../../types/room';
import type { Reservation } from '../../types/reservation';

const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function ReservationCreate() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as {
    roomId?: string;
    checkInDate?: string;
    checkOutDate?: string;
    numberOfGuests?: number;
    room?: Room;
    numberOfNights?: number;
    estimatedTotal?: string;
  } | null;

  const initialRoomId = searchParams.get('roomId') || state?.roomId || '';
  const initialCheckIn = searchParams.get('checkInDate') || state?.checkInDate || '';
  const initialCheckOut = searchParams.get('checkOutDate') || state?.checkOutDate || '';
  const initialGuests =
    searchParams.get('numberOfGuests') ||
    (state?.numberOfGuests ? String(state.numberOfGuests) : '1');

  const [roomId] = useState<string>(initialRoomId);
  const [checkInDate, setCheckInDate] = useState<string>(initialCheckIn);
  const [checkOutDate, setCheckOutDate] = useState<string>(initialCheckOut);
  const [numberOfGuests, setNumberOfGuests] = useState<string>(initialGuests);

  const [room, setRoom] = useState<Room | null>(state?.room || null);
  const [roomLoading, setRoomLoading] = useState(!state?.room && Boolean(initialRoomId));

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    roomId?: string;
    checkInDate?: string;
    checkOutDate?: string;
    numberOfGuests?: string;
  }>({});

  // Success confirmation state
  const [createdReservation, setCreatedReservation] = useState<Reservation | null>(null);

  const todayStr = getTodayDateString();

  // Load room details if not provided in route state
  useEffect(() => {
    if (!room && roomId) {
      getRoomById(roomId)
        .then((data) => setRoom(data))
        .catch(() => setErrorMessage('Unable to load details for the selected room.'))
        .finally(() => setRoomLoading(false));
    }
  }, [room, roomId]);

  // Calculate nights
  const calculateNights = (inDate: string, outDate: string): number => {
    if (!inDate || !outDate) return 1;
    const start = new Date(inDate).getTime();
    const end = new Date(outDate).getTime();
    const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const nights = calculateNights(checkInDate, checkOutDate);
  const estimatedTotal = room && nights > 0 ? (room.pricePerNight * nights).toFixed(2) : null;

  // Validation
  const validateForm = (): boolean => {
    const errors: {
      roomId?: string;
      checkInDate?: string;
      checkOutDate?: string;
      numberOfGuests?: string;
    } = {};

    // 1. Room ID required
    if (!roomId.trim()) {
      errors.roomId = 'Room ID is required.';
    }

    // 2. Check-in required
    if (!checkInDate.trim()) {
      errors.checkInDate = 'Check-in date is required.';
    } else if (checkInDate < todayStr) {
      // 3. Check-in cannot be before today
      errors.checkInDate = 'Check-in date cannot be before today.';
    }

    // 4. Check-out required
    if (!checkOutDate.trim()) {
      errors.checkOutDate = 'Check-out date is required.';
    } else if (checkInDate && checkOutDate <= checkInDate) {
      // 5. Check-out must be after check-in
      errors.checkOutDate = 'Check-out date must be after check-in date.';
    }

    // 6. Guests required and >= 1
    const guestsNum = parseInt(numberOfGuests, 10);
    if (!numberOfGuests.trim() || isNaN(guestsNum)) {
      errors.numberOfGuests = 'Number of guests is required.';
    } else if (guestsNum < 1) {
      errors.numberOfGuests = 'Number of guests must be at least 1.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent submission while loading/submitting
    if (submitting) return;

    setErrorMessage(null);

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const reservation = await createReservation({
        roomId: roomId.trim(),
        checkInDate,
        checkOutDate,
        numberOfGuests: parseInt(numberOfGuests, 10),
      });

      setCreatedReservation(reservation);
    } catch (err: any) {
      const status = err?.response?.status;
      const serverMessage = err?.response?.data?.message || err?.response?.data?.error;

      if (status === 409) {
        // Room unavailable / date conflict
        setErrorMessage('This room is no longer available for the selected dates.');
      } else if (status === 401 || status === 403) {
        setErrorMessage('Your session has expired or you are unauthorized. Please log in again.');
      } else if (status === 400) {
        setErrorMessage(serverMessage || 'Invalid reservation request. Please review your dates and guest count.');
      } else if (err?.code === 'ERR_NETWORK' || !err?.response) {
        setErrorMessage('Unable to connect to the reservation service. Please verify your connection and try again.');
      } else {
        setErrorMessage(serverMessage || 'Failed to create reservation. Please try again later.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // SUCCESS CONFIRMATION VIEW
  if (createdReservation) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reservation Confirmed!</h1>
              <p className="text-sm text-gray-600">
                Your reservation has been created successfully and is awaiting review.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-5 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Reservation Summary
            </h2>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-gray-500">Reservation ID</dt>
                <dd className="font-semibold text-gray-900 break-all">
                  {createdReservation.reservationId}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Status</dt>
                <dd>
                  <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                    {createdReservation.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Room</dt>
                <dd className="font-semibold text-gray-900">
                  {room ? `Room ${room.roomNumber} (${room.roomType})` : createdReservation.roomId}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Guests</dt>
                <dd className="font-semibold text-gray-900">
                  {createdReservation.numberOfGuests}{' '}
                  {createdReservation.numberOfGuests === 1 ? 'Guest' : 'Guests'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Dates</dt>
                <dd className="font-semibold text-gray-900">
                  {createdReservation.checkInDate} to {createdReservation.checkOutDate} ({nights}{' '}
                  {nights === 1 ? 'night' : 'nights'})
                </dd>
              </div>
              {estimatedTotal && (
                <div>
                  <dt className="text-gray-500">Estimated Total</dt>
                  <dd className="font-bold text-indigo-600">${estimatedTotal}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate('/customer/reservations')}
              className="rounded-md bg-indigo-600 px-5 py-2.5 text-center text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
            >
              Go to My Reservations →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Complete Reservation</h1>
          <p className="text-sm text-gray-600">
            Confirm your booking details below.
          </p>
        </div>
        <Link
          to="/customer"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Choose Another Room
        </Link>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800"
        >
          <div className="flex items-start gap-3">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-semibold">{errorMessage}</p>
              <p className="mt-1 text-xs text-red-700">
                You can adjust your dates or click &quot;Choose Another Room&quot; above.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Room Details & Booking Form */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {roomLoading ? (
          <div className="p-12 text-center text-gray-500">Loading room details...</div>
        ) : (
          <>
            {room?.images && room.images.length > 0 && (
              <div className="h-60 w-full bg-gray-100">
                <img
                  src={room.images[0]}
                  alt={`Room ${room.roomNumber}`}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div className="p-6 space-y-6">
              {/* Selected Room Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {room ? `Room ${room.roomNumber}` : `Room ID: ${roomId || 'Not selected'}`}
                  </h2>
                  {room && (
                    <p className="mt-0.5 text-xs text-gray-500">
                      Floor {room.floor} · Status: {room.status}
                    </p>
                  )}
                </div>
                {room && (
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    {room.roomType}
                  </span>
                )}
              </div>

              {/* Reservation Form */}
              <form onSubmit={handleSubmit} noValidate className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Check-in Date */}
                  <div>
                    <label
                      htmlFor="checkInDate"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Check-in Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="checkInDate"
                      name="checkInDate"
                      min={todayStr}
                      value={checkInDate}
                      disabled={submitting}
                      onChange={(e) => {
                        setCheckInDate(e.target.value);
                        if (validationErrors.checkInDate) {
                          setValidationErrors((prev) => ({ ...prev, checkInDate: undefined }));
                        }
                      }}
                      className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-xs focus:ring-2 focus:outline-hidden ${
                        validationErrors.checkInDate
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                          : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
                      } ${submitting ? 'cursor-not-allowed bg-gray-100' : 'bg-white'}`}
                    />
                    {validationErrors.checkInDate && (
                      <p className="mt-1 text-xs text-red-600">
                        {validationErrors.checkInDate}
                      </p>
                    )}
                  </div>

                  {/* Check-out Date */}
                  <div>
                    <label
                      htmlFor="checkOutDate"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Check-out Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="checkOutDate"
                      name="checkOutDate"
                      min={checkInDate || todayStr}
                      value={checkOutDate}
                      disabled={submitting}
                      onChange={(e) => {
                        setCheckOutDate(e.target.value);
                        if (validationErrors.checkOutDate) {
                          setValidationErrors((prev) => ({ ...prev, checkOutDate: undefined }));
                        }
                      }}
                      className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-xs focus:ring-2 focus:outline-hidden ${
                        validationErrors.checkOutDate
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                          : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
                      } ${submitting ? 'cursor-not-allowed bg-gray-100' : 'bg-white'}`}
                    />
                    {validationErrors.checkOutDate && (
                      <p className="mt-1 text-xs text-red-600">
                        {validationErrors.checkOutDate}
                      </p>
                    )}
                  </div>

                  {/* Number of Guests */}
                  <div>
                    <label
                      htmlFor="numberOfGuests"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Number of Guests <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="numberOfGuests"
                      name="numberOfGuests"
                      min="1"
                      step="1"
                      value={numberOfGuests}
                      disabled={submitting}
                      onChange={(e) => {
                        setNumberOfGuests(e.target.value);
                        if (validationErrors.numberOfGuests) {
                          setValidationErrors((prev) => ({
                            ...prev,
                            numberOfGuests: undefined,
                          }));
                        }
                      }}
                      className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-xs focus:ring-2 focus:outline-hidden ${
                        validationErrors.numberOfGuests
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                          : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
                      } ${submitting ? 'cursor-not-allowed bg-gray-100' : 'bg-white'}`}
                    />
                    {validationErrors.numberOfGuests && (
                      <p className="mt-1 text-xs text-red-600">
                        {validationErrors.numberOfGuests}
                      </p>
                    )}
                  </div>

                  {/* Room ID Display */}
                  <div>
                    <label
                      htmlFor="roomId"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Room ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="roomId"
                      name="roomId"
                      value={roomId}
                      readOnly
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 shadow-xs cursor-not-allowed"
                    />
                    {validationErrors.roomId && (
                      <p className="mt-1 text-xs text-red-600">{validationErrors.roomId}</p>
                    )}
                  </div>
                </div>

                {/* Price Calculation Card */}
                {room && (
                  <div className="rounded-lg bg-gray-50 p-4 space-y-2 border border-gray-200">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Price per night:</span>
                      <span className="font-medium text-gray-900">${room.pricePerNight}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Number of nights:</span>
                      <span className="font-medium text-gray-900">
                        {nights} {nights === 1 ? 'night' : 'nights'}
                      </span>
                    </div>
                    {estimatedTotal && (
                      <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
                        <span>Estimated Total:</span>
                        <span className="text-indigo-600">${estimatedTotal}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Submit button */}
                <div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`flex w-full items-center justify-center gap-2 rounded-md px-6 py-3 text-base font-semibold text-white shadow-xs transition ${
                      submitting
                        ? 'cursor-not-allowed bg-indigo-400'
                        : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden'
                    }`}
                  >
                    {submitting ? (
                      <>
                        <svg
                          className="h-5 w-5 animate-spin text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8H4z"
                          />
                        </svg>
                        <span>Confirming Reservation...</span>
                      </>
                    ) : (
                      <span>Confirm Reservation</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
