import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Reveal from '../../components/site/Reveal';
import SiteLink from '../../components/site/SiteLink';
import { getAvailableRooms } from '../../services/availabilityService';
import type { AvailabilitySearchParams } from '../../types/availability';
import type { Room } from '../../types/room';
import { formatMoney, nightsBetween, roomTypeLabel } from '../../utils/siteFormat';

/** Local `YYYY-MM-DD`, used as the `min` on the check-in field. */
function todayString(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

interface FieldErrors {
  checkInDate?: string;
  checkOutDate?: string;
  numberOfGuests?: string;
}

/**
 * Availability search and results — the public "Book your stay" page.
 *
 * Dates can arrive as query params (from the landing page's booking form or a
 * room's "Check availability" button); when they do, the search runs on mount
 * so the guest lands on results rather than an empty form.
 */
export default function AvailabilityPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Read the incoming params once, at mount: they seed both the form and the
  // automatic first search.
  const [initial] = useState(() => ({
    checkInDate: searchParams.get('checkInDate') ?? '',
    checkOutDate: searchParams.get('checkOutDate') ?? '',
    numberOfGuests: Number(searchParams.get('numberOfGuests') ?? '') || 1,
    preferredRoomId: searchParams.get('roomId') ?? '',
  }));

  const shouldAutoSearch = Boolean(initial.checkInDate && initial.checkOutDate);

  const [checkInDate, setCheckInDate] = useState(initial.checkInDate);
  const [checkOutDate, setCheckOutDate] = useState(initial.checkOutDate);
  const [numberOfGuests, setNumberOfGuests] = useState(String(initial.numberOfGuests));

  const [applied, setApplied] = useState<AvailabilitySearchParams | null>(
    shouldAutoSearch
      ? {
          checkInDate: initial.checkInDate,
          checkOutDate: initial.checkOutDate,
          numberOfGuests: initial.numberOfGuests,
        }
      : null,
  );

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(shouldAutoSearch);
  const [hasSearched, setHasSearched] = useState(shouldAutoSearch);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState('');

  // Run the seeded search. No synchronous setState here, so this stays a pure
  // "synchronise with an external system" effect.
  useEffect(() => {
    if (!shouldAutoSearch) return;

    let ignore = false;

    getAvailableRooms({
      checkInDate: initial.checkInDate,
      checkOutDate: initial.checkOutDate,
      numberOfGuests: initial.numberOfGuests,
    })
      .then((data) => {
        if (!ignore) setRooms(data ?? []);
      })
      .catch((err: any) => {
        if (!ignore) setApiError(describeError(err));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [shouldAutoSearch, initial]);

  const validate = (): boolean => {
    const next: FieldErrors = {};
    const today = todayString();

    if (!checkInDate) {
      next.checkInDate = 'Check-in date is required.';
    } else if (checkInDate < today) {
      next.checkInDate = 'Check-in date cannot be before today.';
    }

    if (!checkOutDate) {
      next.checkOutDate = 'Check-out date is required.';
    } else if (checkInDate && checkOutDate <= checkInDate) {
      next.checkOutDate = 'Check-out date must be after check-in date.';
    }

    const guests = parseInt(numberOfGuests, 10);
    if (!numberOfGuests.trim() || Number.isNaN(guests)) {
      next.numberOfGuests = 'Number of guests is required.';
    } else if (guests < 1) {
      next.numberOfGuests = 'Number of guests must be at least 1.';
    }

    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setApiError('');

    if (!validate()) return;

    const params: AvailabilitySearchParams = {
      checkInDate,
      checkOutDate,
      numberOfGuests: parseInt(numberOfGuests, 10),
    };

    setLoading(true);
    setApplied(params);

    try {
      const data = await getAvailableRooms(params);
      setRooms(data ?? []);
    } catch (err: any) {
      setApiError(describeError(err));
      setRooms([]);
    } finally {
      setHasSearched(true);
      setLoading(false);
    }
  };

  const nights = applied ? nightsBetween(applied.checkInDate, applied.checkOutDate) : 1;

  /** Carries the dates and room through to the booking wizard. */
  const reserveLink = (room: Room) => {
    if (!applied) return '/rooms';

    const query = new URLSearchParams({
      roomId: room.roomId,
      checkInDate: applied.checkInDate,
      checkOutDate: applied.checkOutDate,
      numberOfGuests: String(applied.numberOfGuests),
    });

    return `/reservations/new?${query.toString()}`;
  };

  return (
    <div className="px-6 pb-24 md:px-12 md:pb-32">
      <header className="max-w-3xl pt-4 pb-12 md:pb-16">
        <p className="text-[10px] tracking-[0.3em] text-gold-ink uppercase">Reserve</p>
        <h1 className="mt-4 text-[clamp(2rem,6vw,4.5rem)] leading-[0.95] font-semibold tracking-[-0.02em] uppercase">
          Book your stay
        </h1>
        <p className="mt-6 max-w-md text-sm leading-[2.1] text-muted">
          Choose your dates and we will show you what is open on the ridge.
        </p>
      </header>

      {/* Search form */}
      <form onSubmit={handleSearch} className="max-w-3xl border-y border-line py-8" noValidate>
        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <label htmlFor="check-in" className="block text-[10px] tracking-[0.24em] text-muted uppercase">
              Check in
            </label>
            <input
              id="check-in"
              type="date"
              value={checkInDate}
              min={todayString()}
              onChange={(event) => setCheckInDate(event.target.value)}
              aria-invalid={Boolean(fieldErrors.checkInDate)}
              className="w-full border-b border-line bg-transparent py-2.5 text-sm text-ink outline-none transition-colors duration-300 focus:border-royal"
            />
            {fieldErrors.checkInDate && (
              <p className="mt-1.5 text-xs text-danger-ink">{fieldErrors.checkInDate}</p>
            )}
          </div>

          <div>
            <label htmlFor="check-out" className="block text-[10px] tracking-[0.24em] text-muted uppercase">
              Check out
            </label>
            <input
              id="check-out"
              type="date"
              value={checkOutDate}
              min={checkInDate || todayString()}
              onChange={(event) => setCheckOutDate(event.target.value)}
              aria-invalid={Boolean(fieldErrors.checkOutDate)}
              className="w-full border-b border-line bg-transparent py-2.5 text-sm text-ink outline-none transition-colors duration-300 focus:border-royal"
            />
            {fieldErrors.checkOutDate && (
              <p className="mt-1.5 text-xs text-danger-ink">{fieldErrors.checkOutDate}</p>
            )}
          </div>

          <div>
            <label htmlFor="guests" className="block text-[10px] tracking-[0.24em] text-muted uppercase">
              Guests
            </label>
            <select
              id="guests"
              value={numberOfGuests}
              onChange={(event) => setNumberOfGuests(event.target.value)}
              aria-invalid={Boolean(fieldErrors.numberOfGuests)}
              className="w-full border-b border-line bg-transparent py-2.5 text-sm text-ink outline-none transition-colors duration-300 focus:border-royal"
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
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-9 rounded-full bg-navy px-9 py-3.5 text-[11px] tracking-[0.28em] text-white uppercase transition-colors duration-500 hover:bg-royal disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Searching…' : 'Search rooms'}
        </button>
      </form>

      <div className="mt-12">
        {apiError && (
          <p role="alert" className="border-l-2 border-danger bg-danger/5 px-4 py-3 text-sm text-muted">
            {apiError}
          </p>
        )}

        {loading ? (
          <p className="py-16 text-center text-sm text-muted" role="status">
            Checking availability…
          </p>
        ) : !hasSearched ? (
          <p className="py-10 text-sm text-muted">
            Enter your dates above to see which rooms are open.
          </p>
        ) : rooms.length === 0 && !apiError ? (
          <div className="border border-dashed border-line px-6 py-16 text-center">
            <p className="text-sm tracking-[0.18em] text-muted uppercase">
              No rooms available
            </p>
            <p className="mt-3 text-sm text-muted">
              Try different dates or a smaller party.
            </p>
          </div>
        ) : (
          <>
            {applied && (
              <p className="mb-8 text-[11px] tracking-[0.22em] text-muted uppercase">
                {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'} · {applied.checkInDate} to{' '}
                {applied.checkOutDate} · {nights} {nights === 1 ? 'night' : 'nights'} ·{' '}
                {applied.numberOfGuests}{' '}
                {applied.numberOfGuests === 1 ? 'guest' : 'guests'}
              </p>
            )}

            <div className="grid gap-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
              {rooms.map((room, index) => {
                const total = room.pricePerNight * nights;
                const isPreferred = room.roomId === initial.preferredRoomId;

                return (
                  <Reveal key={room.roomId} delay={(index % 3) * 120}>
                    <div
                      className={`flex h-full flex-col ${
                        isPreferred ? 'ring-1 ring-gold-ink' : ''
                      }`}
                    >
                      <div className="overflow-hidden">
                        {room.images?.length > 0 ? (
                          <img
                            src={room.images[0]}
                            alt={`Room ${room.roomNumber}`}
                            loading="lazy"
                            className="aspect-[4/5] w-full object-cover"
                          />
                        ) : (
                          <div className="flex aspect-[4/5] w-full items-center justify-center bg-line/40 text-xs tracking-[0.2em] text-muted uppercase">
                            No image
                          </div>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col border-t border-line pt-4">
                        <div className="flex items-baseline justify-between gap-4">
                          <p className="text-[11px] tracking-[0.22em] uppercase">
                            Room {room.roomNumber}
                          </p>
                          {isPreferred && (
                            <span className="text-[10px] tracking-[0.2em] text-gold-ink uppercase">
                              Your pick
                            </span>
                          )}
                        </div>

                        <p className="mt-1.5 text-xs text-muted">
                          {roomTypeLabel(room.roomType)} · Floor {room.floor}
                        </p>

                        <p className="mt-4 text-sm text-gold-ink">
                          {formatMoney(room.pricePerNight)}
                          <span className="text-muted"> / night</span>
                        </p>

                        <p className="mt-1 text-xs text-muted">
                          {formatMoney(total)} for {nights} {nights === 1 ? 'night' : 'nights'}
                        </p>

                        <SiteLink
                          to={reserveLink(room)}
                          className="mt-6 block rounded-full border border-line px-6 py-3 text-center text-[11px] tracking-[0.22em] text-ink uppercase transition-colors duration-500 hover:border-navy hover:bg-royal hover:text-white"
                        >
                          Reserve
                        </SiteLink>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Signed-out guests still reach the wizard; its guard sends them to
          sign-in first. Stated up front so it is not a surprise at the end. */}
      <p className="mt-16 text-xs text-muted">
        You will be asked to sign in before your reservation is confirmed.{' '}
        <button
          type="button"
          onClick={() => navigate('/rooms')}
          className="underline underline-offset-4 hover:text-ink"
        >
          Browse rooms instead
        </button>
      </p>
    </div>
  );
}

/** Turns an axios failure into something a guest can act on. */
function describeError(error: any): string {
  if (error?.code === 'ERR_NETWORK' || !error?.response) {
    return 'We cannot reach the hotel right now. Please try again in a moment.';
  }

  const status = error.response?.status;
  const serverMessage = error.response?.data?.message || error.response?.data?.error;

  if (status === 401 || status === 403) {
    return 'Your session has expired. Please sign in again.';
  }

  if (status === 400) {
    return serverMessage || 'Those dates look invalid. Check-out must be after check-in.';
  }

  return serverMessage || 'Something went wrong while checking availability.';
}
