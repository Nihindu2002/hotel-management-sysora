import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AccountError,
  AccountHeading,
  AccountLoading,
  AccountSuccess,
  OUTLINE_BUTTON,
} from '../../../components/site/AccountPage';
import SiteLink from '../../../components/site/SiteLink';
import StatusPill from '../../../components/site/StatusPill';
import { getInvoiceByReservationId } from '../../../services/invoiceService';
import { cancelCustomerReservation, getReservationById } from '../../../services/reservationService';
import { getRoomById } from '../../../services/roomService';
import type { Invoice } from '../../../types/invoice';
import type { Reservation } from '../../../types/reservation';
import type { Room } from '../../../types/room';
import {
  formatDate,
  formatDateTime,
  formatMoney,
  invoicePaidAndRemaining,
  nightsBetween,
  roomTypeLabel,
} from '../../../utils/siteFormat';
import { roomImageSrcSet, roomImageUrl } from '../../../utils/roomImage';

/**
 * A guest's view of one reservation.
 *
 * The staff equivalent lives at /staff/reservations/:id and keeps the dashboard
 * chrome and the confirm / check-in / check-out controls; this page is
 * read-and-pay only.
 */
export default function BookingDetail() {
  const { reservationId } = useParams<{ reservationId: string }>();
  const navigate = useNavigate();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  useEffect(() => {
    if (!reservationId) return;

    let ignore = false;

    // The invoice is keyed by reservationId, which we already have, so fire it
    // alongside the reservation rather than nesting it inside the response
    // handler where it cost a whole extra round trip.
    getInvoiceByReservationId(reservationId)
      .then((fetched) => {
        if (!ignore) setInvoice(fetched);
      })
      .catch(() => {
        if (!ignore) setInvoice(null);
      });

    getReservationById(reservationId)
      .then((loaded) => {
        if (ignore) return;
        setReservation(loaded);

        // The room genuinely needs loaded.roomId, so this hop stays nested.
        // It is supporting detail: a failure should not blank the page.
        if (loaded.roomId) {
          getRoomById(loaded.roomId)
            .then((fetched) => {
              if (!ignore) setRoom(fetched);
            })
            .catch(() => {
              if (!ignore) setRoom(null);
            });
        }
      })
      .catch((err: any) => {
        if (ignore) return;

        if (err?.response?.status === 403) {
          setError('You are not authorised to view this reservation.');
        } else if (err?.response?.status === 404) {
          setError('We could not find that reservation.');
        } else {
          setError(err?.response?.data?.message || 'We could not load this reservation.');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [reservationId]);

  const handleCancel = async () => {
    if (!reservation) return;

    setCancelling(true);
    setCancelError('');

    try {
      const updated = await cancelCustomerReservation(reservation.reservationId);
      setReservation(updated);
      setConfirmingCancel(false);
      setSuccessMessage('Your reservation has been cancelled.');
    } catch (err: any) {
      setCancelError(
        err?.response?.data?.message || 'We could not cancel that reservation. Please try again.',
      );
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <AccountLoading label="Loading reservation…" />;

  if (error || !reservation) {
    return (
      <div className="space-y-8">
        <AccountError>{error || 'We could not find that reservation.'}</AccountError>
        <div className="flex flex-wrap items-center gap-4">
          <SiteLink to="/account/reservations" className={OUTLINE_BUTTON}>
            All reservations
          </SiteLink>
          <button type="button" onClick={() => navigate(-1)} className={OUTLINE_BUTTON}>
            Go back
          </button>
        </div>
      </div>
    );
  }

  const nights = nightsBetween(reservation.checkInDate, reservation.checkOutDate);
  const estimatedTotal = room ? nights * room.pricePerNight : null;

  const isCancellable = reservation.status === 'PENDING' || reservation.status === 'CONFIRMED';
  const { remaining } = invoice
    ? invoicePaidAndRemaining(invoice)
    : { remaining: 0 };

  return (
    <div className="space-y-12">
      <button
        type="button"
        onClick={() => navigate('/account/reservations')}
        className="text-[11px] tracking-[0.22em] text-muted uppercase transition-colors duration-300 hover:text-ink"
      >
        ← All reservations
      </button>

      <AccountHeading
        eyebrow={`Reference ${reservation.reservationId}`}
        title={`${formatDate(reservation.checkInDate)} — ${formatDate(reservation.checkOutDate)}`}
        description={`${nights} ${nights === 1 ? 'night' : 'nights'} · ${reservation.numberOfGuests} ${
          reservation.numberOfGuests === 1 ? 'guest' : 'guests'
        }`}
        action={<StatusPill status={reservation.status} />}
      />

      {successMessage && <AccountSuccess>{successMessage}</AccountSuccess>}

      {reservation.status === 'PENDING' && (
        <p className="max-w-2xl border-l-2 border-line bg-line/20 px-4 py-3 text-sm leading-relaxed text-muted">
          Your booking is awaiting staff confirmation. Once the front desk confirms it, your invoice
          is generated and payment opens.
        </p>
      )}

      {room?.status === 'CLEANING' && reservation.status === 'CONFIRMED' && (
        <p className="max-w-2xl border-l-2 border-line bg-line/20 px-4 py-3 text-sm leading-relaxed text-muted">
          Your room is being prepared by housekeeping. Check-in opens as soon as that is complete.
        </p>
      )}

      <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
        {/* Stay */}
        <section>
          <h2 className="text-[11px] tracking-[0.24em] text-muted uppercase">Your stay</h2>

          <dl className="mt-4">
            {[
              { label: 'Check in', value: formatDate(reservation.checkInDate) },
              { label: 'Check out', value: formatDate(reservation.checkOutDate) },
              { label: 'Nights', value: `${nights}` },
              {
                label: 'Guests',
                value: `${reservation.numberOfGuests} ${
                  reservation.numberOfGuests === 1 ? 'guest' : 'guests'
                }`,
              },
              { label: 'Booked', value: formatDateTime(reservation.createdAt) },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-6 border-b border-line py-4 first:border-t"
              >
                <dt className="text-sm text-muted">{row.label}</dt>
                <dd className="text-sm">{row.value}</dd>
              </div>
            ))}
          </dl>

          {room && (
            <>
              <h3 className="mt-10 text-[11px] tracking-[0.24em] text-muted uppercase">
                Your room
              </h3>

              <div className="mt-4 border border-line">
                {room.images?.length > 0 && (
                  <img
                    src={roomImageUrl(room.images[0], 1440, '16:9')}
                    srcSet={roomImageSrcSet(room.images[0], [640, 1080, 1440], '16:9')}
                    sizes="(min-width: 768px) 60vw, 100vw"
                    alt={`Room ${room.roomNumber}`}
                    className="aspect-[16/9] w-full object-cover"
                  />
                )}

                <div className="p-6">
                  <p className="text-sm font-semibold tracking-[0.05em] uppercase">
                    Room {room.roomNumber}
                  </p>
                  <p className="mt-1.5 text-xs text-muted">
                    {roomTypeLabel(room.roomType)} · Floor {room.floor}
                  </p>

                  <dl className="mt-5 space-y-2.5 border-t border-line pt-4 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Per night</dt>
                      <dd>{formatMoney(room.pricePerNight)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="font-semibold">Estimated total</dt>
                      <dd className="font-semibold">
                        {estimatedTotal !== null ? formatMoney(estimatedTotal) : '—'}
                      </dd>
                    </div>
                  </dl>

                  <SiteLink
                    to={`/rooms/${room.roomId}`}
                    className="mt-5 inline-block text-[11px] tracking-[0.2em] text-gold-ink uppercase transition-colors duration-300 hover:text-ink"
                  >
                    View room →
                  </SiteLink>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Billing */}
        <section>
          <h2 className="text-[11px] tracking-[0.24em] text-muted uppercase">Billing</h2>

          {invoice ? (
            <>
              <dl className="mt-4">
                {[
                  { label: 'Room charge', value: formatMoney(invoice.roomCharge) },
                  { label: 'Additional charges', value: formatMoney(invoice.additionalCharges) },
                  { label: 'Discount', value: `−${formatMoney(invoice.discount)}` },
                  {
                    label: 'Total',
                    value: formatMoney(invoice.totalAmount),
                    strong: true,
                  },
                  {
                    label: 'Remaining',
                    value: formatMoney(remaining),
                    accent: remaining > 0,
                    strong: true,
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-baseline justify-between gap-6 border-b border-line py-4 first:border-t"
                  >
                    <dt className="text-sm text-muted">{row.label}</dt>
                    <dd
                      className={`text-sm ${row.strong ? 'font-semibold' : ''} ${
                        row.accent ? 'text-danger-ink' : ''
                      }`}
                    >
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-6 flex flex-wrap items-center gap-4">
                <Link
                  to={`/account/invoices/${invoice.invoiceId}`}
                  className="text-[11px] tracking-[0.2em] text-muted uppercase transition-colors duration-300 hover:text-ink"
                >
                  View invoice
                </Link>

                {remaining > 0 && (
                  <Link
                    to={`/account/payments/new?invoiceId=${invoice.invoiceId}`}
                    className="rounded-full bg-navy px-7 py-3 text-[11px] tracking-[0.22em] text-white uppercase transition-colors duration-500 hover:bg-royal"
                  >
                    Pay {formatMoney(remaining)}
                  </Link>
                )}
              </div>
            </>
          ) : (
            <p className="mt-4 border border-dashed border-line px-5 py-10 text-center text-sm text-muted">
              {reservation.status === 'PENDING'
                ? 'An invoice is raised once the hotel confirms your booking.'
                : reservation.status === 'CANCELLED'
                  ? 'No invoice was raised for this cancelled reservation.'
                  : 'No invoice found for this reservation.'}
            </p>
          )}

          {isCancellable && (
            <div className="mt-12 border-t border-line pt-8">
              <h3 className="text-[11px] tracking-[0.24em] text-muted uppercase">
                Manage
              </h3>

              {cancelError && (
                <div className="mt-4">
                  <AccountError>{cancelError}</AccountError>
                </div>
              )}

              {confirmingCancel ? (
                <div className="mt-5 border border-line p-5">
                  <p className="text-sm text-muted">
                    Cancel this reservation? This cannot be undone.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="rounded-full bg-danger-ink px-7 py-3 text-[11px] tracking-[0.22em] text-white uppercase transition-colors duration-500 hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {cancelling ? 'Cancelling…' : 'Yes, cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingCancel(false)}
                      disabled={cancelling}
                      className={OUTLINE_BUTTON}
                    >
                      Keep it
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setCancelError('');
                    setConfirmingCancel(true);
                  }}
                  className="mt-4 rounded-full border border-line px-7 py-3 text-[11px] tracking-[0.22em] text-muted uppercase transition-colors duration-500 hover:border-danger hover:text-danger-ink"
                >
                  Cancel reservation
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
