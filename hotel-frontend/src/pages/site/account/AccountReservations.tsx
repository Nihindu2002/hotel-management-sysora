import { useCallback, useEffect, useState } from 'react';
import {
  AccountEmpty,
  AccountError,
  AccountHeading,
  AccountLoading,
  AccountSuccess,
  OUTLINE_BUTTON,
} from '../../../components/site/AccountPage';
import SiteLink from '../../../components/site/SiteLink';
import StatusPill from '../../../components/site/StatusPill';
import { cancelCustomerReservation, getMyReservations } from '../../../services/reservationService';
import type { Reservation } from '../../../types/reservation';
import { formatDate, nightsBetween } from '../../../utils/siteFormat';

export default function AccountReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [reservationToCancel, setReservationToCancel] = useState<Reservation | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const loadReservations = useCallback(async () => {
    const data = await getMyReservations();
    setReservations(data ?? []);
  }, []);

  useEffect(() => {
    let ignore = false;

    getMyReservations()
      .then((data) => {
        if (!ignore) setReservations(data ?? []);
      })
      .catch((err: any) => {
        if (!ignore) {
          setError(err?.response?.data?.message || 'We could not load your reservations.');
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
    setCancelError('');

    try {
      await cancelCustomerReservation(reservationToCancel.reservationId);
      setSuccessMessage(`Reservation ${reservationToCancel.reservationId} has been cancelled.`);
      setReservationToCancel(null);
      await loadReservations();
    } catch (err: any) {
      setCancelError(
        err?.response?.data?.message || 'We could not cancel that reservation. Please try again.',
      );
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <AccountLoading label="Loading your reservations…" />;

  const today = new Date().toISOString().slice(0, 10);

  const groups = [
    {
      title: 'Current stay',
      items: reservations.filter(
        (r) =>
          r.status === 'CHECKED_IN' ||
          (r.status === 'CONFIRMED' && r.checkInDate <= today && r.checkOutDate >= today),
      ),
    },
    {
      title: 'Upcoming',
      items: reservations.filter(
        (r) => (r.status === 'CONFIRMED' || r.status === 'PENDING') && r.checkInDate > today,
      ),
    },
    {
      title: 'Past',
      items: reservations.filter(
        (r) =>
          r.status === 'CHECKED_OUT' ||
          (r.checkOutDate < today && r.status !== 'CANCELLED' && r.status !== 'CHECKED_IN'),
      ),
    },
    {
      title: 'Cancelled',
      items: reservations.filter((r) => r.status === 'CANCELLED'),
    },
  ].filter((group) => group.items.length > 0);

  return (
    <div className="space-y-12">
      <AccountHeading
        eyebrow="Your stays"
        title="Reservations"
        description="Every booking on your account, newest first within each group."
        action={
          <SiteLink to="/book" className={OUTLINE_BUTTON}>
            Book a stay
          </SiteLink>
        }
      />

      {error && <AccountError>{error}</AccountError>}
      {successMessage && <AccountSuccess>{successMessage}</AccountSuccess>}

      {reservations.length === 0 && !error ? (
        <AccountEmpty title="No reservations yet" hint="Your first booking will show up here." />
      ) : (
        groups.map((group) => (
          <section key={group.title}>
            <h2 className="text-[11px] tracking-[0.24em] text-muted uppercase">
              {group.title}
            </h2>

            <ul className="mt-4">
              {group.items.map((reservation) => {
                const isCancellable =
                  reservation.status === 'PENDING' || reservation.status === 'CONFIRMED';
                const isConfirmed = reservation.status === 'CONFIRMED';
                const isPending = reservation.status === 'PENDING';
                const nights = nightsBetween(reservation.checkInDate, reservation.checkOutDate);

                return (
                  <li
                    key={reservation.reservationId}
                    className="border-b border-line py-7 first:border-t"
                  >
                    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <p className="text-lg font-semibold tracking-[-0.01em] uppercase">
                          {formatDate(reservation.checkInDate)} —{' '}
                          {formatDate(reservation.checkOutDate)}
                        </p>

                        <p className="mt-2 text-sm text-muted">
                          {nights} {nights === 1 ? 'night' : 'nights'} ·{' '}
                          {reservation.numberOfGuests}{' '}
                          {reservation.numberOfGuests === 1 ? 'guest' : 'guests'}
                        </p>

                        <p className="mt-1.5 font-mono text-[11px] break-all text-muted">
                          {reservation.reservationId}
                        </p>

                        {isPending && (
                          <p className="mt-4 max-w-lg border-l-2 border-line bg-line/20 px-4 py-3 text-xs leading-relaxed text-muted">
                            Awaiting staff approval. Invoices and payments open once the hotel
                            confirms your booking.
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-4">
                        <StatusPill status={reservation.status} />

                        <SiteLink
                          to={`/reservations/${reservation.reservationId}`}
                          className="text-[11px] tracking-[0.2em] text-muted uppercase transition-colors duration-300 hover:text-ink"
                        >
                          Details
                        </SiteLink>

                        {isConfirmed && (
                          <SiteLink
                            to="/account/invoices"
                            className="text-[11px] tracking-[0.2em] text-gold-ink uppercase transition-colors duration-300 hover:text-ink"
                          >
                            Invoice
                          </SiteLink>
                        )}

                        {isCancellable && (
                          <button
                            type="button"
                            onClick={() => {
                              setCancelError('');
                              setReservationToCancel(reservation);
                            }}
                            className="rounded-full border border-line px-5 py-2 text-[10px] tracking-[0.2em] text-muted uppercase transition-colors duration-500 hover:border-danger hover:text-danger-ink"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      {/* Cancel confirmation — a plain overlay rather than a dialog library. */}
      {reservationToCancel && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-heading"
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 px-4"
        >
          <div className="w-full max-w-md bg-surface p-8">
            <h2 id="cancel-heading" className="text-lg font-semibold tracking-[-0.01em] uppercase">
              Cancel this reservation?
            </h2>

            <p className="mt-4 text-sm leading-[1.9] text-muted">
              {formatDate(reservationToCancel.checkInDate)} —{' '}
              {formatDate(reservationToCancel.checkOutDate)}
              <br />
              <span className="font-mono text-[11px] break-all text-muted">
                {reservationToCancel.reservationId}
              </span>
            </p>

            <p className="mt-4 text-sm text-muted">This cannot be undone.</p>

            {cancelError && (
              <div className="mt-5">
                <AccountError>{cancelError}</AccountError>
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelling}
                className="rounded-full bg-danger-ink px-7 py-3 text-[11px] tracking-[0.22em] text-white uppercase transition-colors duration-500 hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancelling ? 'Cancelling…' : 'Yes, cancel'}
              </button>

              <button
                type="button"
                onClick={() => setReservationToCancel(null)}
                disabled={cancelling}
                className={OUTLINE_BUTTON}
              >
                Keep it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
