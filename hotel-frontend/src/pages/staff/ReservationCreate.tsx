import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  createReservation,
  getAvailableRooms,
} from '../../services/reservationService';
import type { Room } from '../../types/room';

/** Today in the format an <input type="date"> wants. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(`${checkIn}T00:00:00`).getTime();
  const end = new Date(`${checkOut}T00:00:00`).getTime();
  return Math.round((end - start) / 86_400_000);
}

function formatMoney(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Takes a booking at the front desk.
 *
 * The desk checks availability first and picks from rooms the backend has
 * actually confirmed are free, then types in the occupant's details. There is
 * no customer account involved and no approval step — the booking is confirmed
 * the moment it is created.
 */
export default function ReservationCreate() {
  const navigate = useNavigate();

  const [checkInDate, setCheckInDate] = useState(today());
  const [checkOutDate, setCheckOutDate] = useState(addDays(today(), 1));
  const [numberOfGuests, setNumberOfGuests] = useState(1);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');

  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nights = nightsBetween(checkInDate, checkOutDate);

  const handleCheckAvailability = async () => {
    setError(null);
    setChecking(true);
    setSelectedRoomId('');

    try {
      const available = await getAvailableRooms(
        checkInDate,
        checkOutDate,
        numberOfGuests,
      );
      setRooms(available);
    } catch (err: any) {
      setRooms(null);
      setError(
        err?.response?.data?.message ||
          'Could not check availability. Please try again.',
      );
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!selectedRoomId) {
      setError('Select a room before creating the reservation.');
      return;
    }

    setSubmitting(true);

    try {
      const reservation = await createReservation({
        roomId: selectedRoomId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        checkInDate,
        checkOutDate,
        numberOfGuests,
      });

      navigate(`/staff/reservations/${reservation.reservationId}`);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Could not create the reservation. Please try again.',
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          to="/reservations"
          className="text-sm font-medium text-royal hover:underline"
        >
          ← Back to reservations
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
          New Reservation
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Check which rooms are free, then record the occupant's details. The
          booking is confirmed immediately.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {/* ── 1. Stay ── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="text-lg font-bold text-gray-900">1. Stay details</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Check-in</span>
            <input
              type="date"
              required
              min={today()}
              value={checkInDate}
              onChange={(e) => {
                setCheckInDate(e.target.value);
                setRooms(null);
              }}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-2 focus:ring-royal/20 focus:outline-hidden"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Check-out</span>
            <input
              type="date"
              required
              min={addDays(checkInDate, 1)}
              value={checkOutDate}
              onChange={(e) => {
                setCheckOutDate(e.target.value);
                setRooms(null);
              }}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-2 focus:ring-royal/20 focus:outline-hidden"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Guests</span>
            <input
              type="number"
              required
              min={1}
              value={numberOfGuests}
              onChange={(e) => {
                setNumberOfGuests(Number(e.target.value));
                setRooms(null);
              }}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-2 focus:ring-royal/20 focus:outline-hidden"
            />
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleCheckAvailability}
            disabled={checking || nights < 1}
            className="rounded-lg bg-royal px-4 py-2 text-sm font-semibold text-white transition hover:bg-royal/90 disabled:opacity-50"
          >
            {checking ? 'Checking…' : 'Check availability'}
          </button>
          {nights > 0 && (
            <span className="text-sm text-gray-600">
              {nights} {nights === 1 ? 'night' : 'nights'}
            </span>
          )}
        </div>
      </section>

      {/* ── 2. Room ── */}
      {rooms !== null && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
          <h2 className="text-lg font-bold text-gray-900">
            2. Select a room
            <span className="ml-2 text-sm font-normal text-gray-500">
              {rooms.length} available
            </span>
          </h2>

          {rooms.length === 0 ? (
            <p className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
              No rooms are free for those dates and that party size. Try
              different dates, or a smaller party.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => {
                const selected = room.roomId === selectedRoomId;
                return (
                  <button
                    key={room.roomId}
                    type="button"
                    onClick={() => setSelectedRoomId(room.roomId)}
                    aria-pressed={selected}
                    className={`rounded-lg border p-4 text-left transition ${
                      selected
                        ? 'border-royal bg-royal/5 ring-2 ring-royal/30'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-gray-900">
                        Room {room.roomNumber}
                      </span>
                      <span className="text-xs font-medium text-gray-500">
                        {room.roomType}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      Floor {room.floor}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-gray-900">
                      {formatMoney(room.pricePerNight)} / night
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── 3. Occupant ── */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs"
      >
        <h2 className="text-lg font-bold text-gray-900">
          3. Occupant details
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          These are recorded on the reservation itself. The hotel does not create
          an account for the guest.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Full name <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              required
              maxLength={120}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Nimal Perera"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-2 focus:ring-royal/20 focus:outline-hidden"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Phone <span className="text-red-500">*</span>
            </span>
            <input
              type="tel"
              required
              maxLength={30}
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="e.g. 0771234567"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-2 focus:ring-royal/20 focus:outline-hidden"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-gray-700">
              Email <span className="text-gray-400">(optional)</span>
            </span>
            <input
              type="email"
              maxLength={120}
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-2 focus:ring-royal/20 focus:outline-hidden"
            />
          </label>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
          <Link
            to="/reservations"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || !selectedRoomId}
            className="rounded-lg bg-royal px-4 py-2 text-sm font-semibold text-white transition hover:bg-royal/90 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create reservation'}
          </button>
        </div>
      </form>
    </div>
  );
}
