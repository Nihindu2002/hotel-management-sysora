import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Reveal from '../../components/site/Reveal';
import SiteLink from '../../components/site/SiteLink';
import StatusPill from '../../components/site/StatusPill';
import { createReservation } from '../../services/reservationService';
import { getRoomById } from '../../services/roomService';
import type { Reservation } from '../../types/reservation';
import type { Room } from '../../types/room';
import { formatMoney, nightsBetween, roomTypeLabel } from '../../utils/siteFormat';

/** Local `YYYY-MM-DD`. */
function todayString(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

interface WizardState {
  roomId?: string;
  checkInDate?: string;
  checkOutDate?: string;
  numberOfGuests?: number;
  room?: Room;
  numberOfNights?: number;
  estimatedTotal?: string;
}

/**
 * The booking wizard.
 *
 * Seeded from query params (`roomId`, `checkInDate`, `checkOutDate`,
 * `numberOfGuests`) or from router state carrying the full `room` — the
 * availability page uses both, so the guest never retypes what they picked.
 */
export default function BookingWizard() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as WizardState | null;

  const [initial] = useState(() => ({
    roomId: searchParams.get('roomId') || state?.roomId || '',
    checkInDate: searchParams.get('checkInDate') || state?.checkInDate || '',
    checkOutDate: searchParams.get('checkOutDate') || state?.checkOutDate || '',
    numberOfGuests:
      searchParams.get('numberOfGuests') ||
      (state?.numberOfGuests ? String(state.numberOfGuests) : '1'),
  }));

  const [roomId] = useState(initial.roomId);
  const [checkInDate, setCheckInDate] = useState(initial.checkInDate);
  const [checkOutDate, setCheckOutDate] = useState(initial.checkOutDate);
  const [numberOfGuests, setNumberOfGuests] = useState(initial.numberOfGuests);

  const [room, setRoom] = useState<Room | null>(state?.room ?? null);
  const [roomLoading, setRoomLoading] = useState(!state?.room && Boolean(initial.roomId));

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    checkInDate?: string;
    checkOutDate?: string;
    numberOfGuests?: string;
  }>({});

  const [createdReservation, setCreatedReservation] = useState<Reservation | null>(null);

  const today = todayString();

  // Fall back to fetching the room when the guest arrived by URL alone.
  useEffect(() => {
    if (room || !roomId) return;

    let ignore = false;

    getRoomById(roomId)
      .then((data) => {
        if (!ignore) setRoom(data);
      })
      .catch(() => {
        if (!ignore) setErrorMessage('We could not load the details for that room.');
      })
      .finally(() => {
        if (!ignore) setRoomLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [room, roomId]);

  const nights =
    checkInDate && checkOutDate ? nightsBetween(checkInDate, checkOutDate) : 0;
  const estimatedTotal = room && nights > 0 ? room.pricePerNight * nights : null;

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {};

    if (!checkInDate.trim()) {
      errors.checkInDate = 'Check-in date is required.';
    } else if (checkInDate < today) {
      errors.checkInDate = 'Check-in date cannot be before today.';
    }

    if (!checkOutDate.trim()) {
      errors.checkOutDate = 'Check-out date is required.';
    } else if (checkInDate && checkOutDate <= checkInDate) {
      errors.checkOutDate = 'Check-out date must be after check-in date.';
    }

    const guests = parseInt(numberOfGuests, 10);
    if (!numberOfGuests.trim() || Number.isNaN(guests)) {
      errors.numberOfGuests = 'Number of guests is required.';
    } else if (guests < 1) {
      errors.numberOfGuests = 'Number of guests must be at least 1.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitting) return;

    setErrorMessage('');

    if (!validate()) return;

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
        setErrorMessage('This room is no longer available for those dates.');
      } else if (status === 401 || status === 403) {
        setErrorMessage('Your session has expired. Please sign in again.');
      } else if (status === 400) {
        setErrorMessage(serverMessage || 'Those details were rejected. Check your dates and party size.');
      } else if (err?.code === 'ERR_NETWORK' || !err?.response) {
        setErrorMessage('We cannot reach the hotel right now. Check your connection.');
      } else {
        setErrorMessage(serverMessage || 'We could not create your reservation. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Confirmation ──
  if (createdReservation) {
    const confirmedNights = nightsBetween(
      createdReservation.checkInDate,
      createdReservation.checkOutDate,
    );

    return (
      <div className="px-6 pb-24 md:px-12 md:pb-32">
        <div className="max-w-2xl pt-4">
          <p className="text-[10px] tracking-[0.3em] text-gold-ink uppercase">Confirmed</p>

          <div className="mt-6 flex items-start justify-between gap-6 border-b border-line pb-7">
            <h1 className="text-[clamp(1.8rem,4.5vw,3rem)] leading-[1.02] font-semibold tracking-[-0.02em] uppercase">
              Your stay is
              <br />
              reserved
            </h1>
            <StatusPill status={createdReservation.status} />
          </div>

          <p className="mt-6 text-sm leading-[2] text-muted">
            We have your booking. It is awaiting review by the front desk — you will be notified
            once it is confirmed, and an invoice will follow.
          </p>

          <dl className="mt-10">
            {[
              {
                label: 'Dates',
                value: `${createdReservation.checkInDate} — ${createdReservation.checkOutDate}`,
              },
              {
                label: 'Nights',
                value: `${confirmedNights} ${confirmedNights === 1 ? 'night' : 'nights'}`,
              },
              {
                label: 'Guests',
                value: `${createdReservation.numberOfGuests} ${
                  createdReservation.numberOfGuests === 1 ? 'guest' : 'guests'
                }`,
              },
              room ? { label: 'Room', value: `Room ${room.roomNumber} · ${roomTypeLabel(room.roomType)}` } : null,
              room && estimatedTotal !== null
                ? { label: 'Estimated total', value: formatMoney(estimatedTotal) }
                : null,
              {
                label: 'Reference',
                value: createdReservation.reservationId,
                mono: true,
              },
            ]
              .filter((row): row is { label: string; value: string; mono?: boolean } => row !== null)
              .map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-6 border-b border-line py-4 first:border-t"
                >
                  <dt className="text-sm text-muted">{row.label}</dt>
                  <dd
                    className={`text-right text-sm ${
                      row.mono ? 'font-mono text-[11px] break-all' : ''
                    }`}
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
          </dl>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <SiteLink
              to="/account/reservations"
              className="rounded-full bg-navy px-8 py-3.5 text-[11px] tracking-[0.24em] text-white uppercase transition-colors duration-500 hover:bg-royal"
            >
              My reservations
            </SiteLink>

            <SiteLink
              to="/rooms"
              className="rounded-full border border-line px-8 py-3.5 text-[11px] tracking-[0.24em] text-ink uppercase transition-colors duration-500 hover:border-navy hover:bg-royal hover:text-white"
            >
              Browse more rooms
            </SiteLink>
          </div>
        </div>
      </div>
    );
  }

  // ── No room chosen: a form that cannot be submitted helps nobody ──
  if (!roomId) {
    return (
      <div className="px-6 pb-24 pt-4 md:px-12 md:pb-32">
        <div className="max-w-xl">
          <p className="text-[10px] tracking-[0.3em] text-gold-ink uppercase">Reserve</p>
          <h1 className="mt-4 text-[clamp(1.8rem,4.5vw,3rem)] leading-[1.02] font-semibold tracking-[-0.02em] uppercase">
            Choose a room first
          </h1>

          <p className="mt-6 text-sm leading-[2] text-muted">
            Pick your dates and we will show you what is open, then you can reserve in a couple of
            steps.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <SiteLink
              to="/book"
              className="rounded-full bg-navy px-8 py-3.5 text-[11px] tracking-[0.24em] text-white uppercase transition-colors duration-500 hover:bg-royal"
            >
              Check availability
            </SiteLink>
            <SiteLink
              to="/rooms"
              className="rounded-full border border-line px-8 py-3.5 text-[11px] tracking-[0.24em] text-ink uppercase transition-colors duration-500 hover:border-navy hover:bg-royal hover:text-white"
            >
              Browse rooms
            </SiteLink>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pb-24 md:px-12 md:pb-32">
      <header className="max-w-2xl pt-4 pb-12">
        <p className="text-[10px] tracking-[0.3em] text-gold-ink uppercase">Reserve</p>
        <h1 className="mt-4 text-[clamp(2rem,5.5vw,3.5rem)] leading-[0.98] font-semibold tracking-[-0.02em] uppercase">
          Complete your
          <br />
          booking
        </h1>
      </header>

      <div className="grid gap-12 lg:grid-cols-[1fr_22rem] lg:gap-16">
        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          {errorMessage && (
            <p role="alert" className="mb-8 border-l-2 border-danger bg-danger/5 px-4 py-3 text-sm text-muted">
              {errorMessage}
            </p>
          )}

          <div className="grid gap-7 sm:grid-cols-2">
            <div>
              <label htmlFor="checkInDate" className="block text-[10px] tracking-[0.24em] text-muted uppercase">
                Check in
              </label>
              <input
                id="checkInDate"
                type="date"
                value={checkInDate}
                min={today}
                onChange={(event) => setCheckInDate(event.target.value)}
                aria-invalid={Boolean(fieldErrors.checkInDate)}
                className={`w-full border-b border-line bg-transparent py-2.5 text-sm text-ink outline-none transition-colors duration-300 focus:border-royal ${
                  fieldErrors.checkInDate ? 'border-danger' : ''
                }`}
              />
              {fieldErrors.checkInDate && (
                <p className="mt-1.5 text-xs text-danger-ink">{fieldErrors.checkInDate}</p>
              )}
            </div>

            <div>
              <label htmlFor="checkOutDate" className="block text-[10px] tracking-[0.24em] text-muted uppercase">
                Check out
              </label>
              <input
                id="checkOutDate"
                type="date"
                value={checkOutDate}
                min={checkInDate || today}
                onChange={(event) => setCheckOutDate(event.target.value)}
                aria-invalid={Boolean(fieldErrors.checkOutDate)}
                className={`w-full border-b border-line bg-transparent py-2.5 text-sm text-ink outline-none transition-colors duration-300 focus:border-royal ${
                  fieldErrors.checkOutDate ? 'border-danger' : ''
                }`}
              />
              {fieldErrors.checkOutDate && (
                <p className="mt-1.5 text-xs text-danger-ink">{fieldErrors.checkOutDate}</p>
              )}
            </div>
          </div>

          <div className="mt-7 sm:max-w-[calc(50%-0.875rem)]">
            <label htmlFor="numberOfGuests" className="block text-[10px] tracking-[0.24em] text-muted uppercase">
              Guests
            </label>
            <select
              id="numberOfGuests"
              value={numberOfGuests}
              onChange={(event) => setNumberOfGuests(event.target.value)}
              aria-invalid={Boolean(fieldErrors.numberOfGuests)}
              className={`w-full border-b border-line bg-transparent py-2.5 text-sm text-ink outline-none transition-colors duration-300 focus:border-royal ${
                fieldErrors.numberOfGuests ? 'border-danger' : ''
              }`}
            >
              {[1, 2, 3, 4, 5, 6].map((count) => (
                <option key={count} value={String(count)}>
                  {count} {count === 1 ? 'guest' : 'guests'}
                </option>
              ))}
            </select>
            {fieldErrors.numberOfGuests && (
              <p className="mt-1.5 text-xs text-danger-ink">{fieldErrors.numberOfGuests}</p>
            )}
          </div>

          <div className="mt-11 flex flex-wrap items-center gap-4 border-t border-line pt-8">
            <button
              type="submit"
              disabled={submitting || roomLoading}
              className="rounded-full bg-navy px-9 py-3.5 text-[11px] tracking-[0.28em] text-white uppercase transition-colors duration-500 hover:bg-royal disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Reserving…' : 'Confirm reservation'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/book')}
              className="rounded-full border border-line px-9 py-3.5 text-[11px] tracking-[0.28em] text-ink uppercase transition-colors duration-500 hover:border-navy hover:bg-royal hover:text-white"
            >
              Change dates
            </button>
          </div>

          <p className="mt-6 text-xs leading-relaxed text-muted">
            No payment is taken now. An invoice is raised once the front desk confirms your booking.
          </p>
        </form>

        {/* Summary */}
        <Reveal className="lg:pt-2">
          <div className="border border-line p-7">
            <h2 className="text-[10px] tracking-[0.24em] text-muted uppercase">
              Your selection
            </h2>

            {roomLoading ? (
              <p className="mt-5 text-sm text-muted">Loading room…</p>
            ) : room ? (
              <>
                {room.images?.length > 0 && (
                  <img
                    src={room.images[0]}
                    alt={`Room ${room.roomNumber}`}
                    className="mt-5 aspect-[4/3] w-full object-cover"
                  />
                )}

                <p className="mt-5 text-sm font-semibold tracking-[0.05em] uppercase">
                  Room {room.roomNumber}
                </p>
                <p className="mt-1.5 text-xs text-muted">
                  {roomTypeLabel(room.roomType)} · Floor {room.floor}
                </p>

                <dl className="mt-6 space-y-3 border-t border-line pt-5 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Per night</dt>
                    <dd>{formatMoney(room.pricePerNight)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Nights</dt>
                    <dd>{nights > 0 ? nights : '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-line pt-3">
                    <dt className="font-semibold">Estimated total</dt>
                    <dd className="font-semibold text-gold-ink">
                      {estimatedTotal !== null ? formatMoney(estimatedTotal) : '—'}
                    </dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="mt-5 text-sm text-muted">
                Room {roomId} — details unavailable.
              </p>
            )}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
