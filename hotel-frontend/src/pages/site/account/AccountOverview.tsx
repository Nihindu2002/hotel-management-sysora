import { useEffect, useState } from 'react';
import {
  AccountEmpty,
  AccountError,
  AccountHeading,
  AccountLoading,
  OUTLINE_BUTTON,
} from '../../../components/site/AccountPage';
import SiteLink from '../../../components/site/SiteLink';
import StatusPill from '../../../components/site/StatusPill';
import { useAuth } from '../../../hooks/useAuth';
import { getMyInvoices } from '../../../services/invoiceService';
import { getMyReservations } from '../../../services/reservationService';
import type { Invoice } from '../../../types/invoice';
import type { Reservation } from '../../../types/reservation';
import {
  formatDate,
  formatMoney,
  invoicePaidAndRemaining,
  nightsBetween,
} from '../../../utils/siteFormat';

/** Reservations that are still ahead of the guest. */
const UPCOMING = new Set(['PENDING', 'CONFIRMED']);

/**
 * The account landing page: a short summary of what a guest actually wants to
 * know — what is booked, what is owed — and the way into each section.
 */
export default function AccountOverview() {
  const { user } = useAuth();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    // Settled rather than all: one failing endpoint should not blank the page.
    Promise.allSettled([getMyReservations(), getMyInvoices()])
      .then(([reservationResult, invoiceResult]) => {
        if (ignore) return;

        if (reservationResult.status === 'fulfilled') {
          setReservations(reservationResult.value ?? []);
        }
        if (invoiceResult.status === 'fulfilled') {
          setInvoices(invoiceResult.value ?? []);
        }

        if (
          reservationResult.status === 'rejected' &&
          invoiceResult.status === 'rejected'
        ) {
          setError('We could not load your account just now. Please try again later.');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  if (loading) return <AccountLoading label="Loading your account…" />;

  const today = new Date().toISOString().slice(0, 10);

  const upcoming = reservations
    .filter((reservation) => UPCOMING.has(reservation.status) && reservation.checkInDate >= today)
    .sort((a, b) => a.checkInDate.localeCompare(b.checkInDate));

  const outstanding = invoices.reduce(
    (sum, invoice) => sum + invoicePaidAndRemaining(invoice).remaining,
    0,
  );

  const nextStay = upcoming[0];

  const stats = [
    { label: 'Upcoming stays', value: String(upcoming.length) },
    { label: 'Reservations', value: String(reservations.length) },
    { label: 'Invoices', value: String(invoices.length) },
    {
      label: 'Outstanding',
      value: formatMoney(outstanding),
      accent: outstanding > 0,
    },
  ];

  return (
    <div className="space-y-12">
      <AccountHeading
        eyebrow="LUMI"
        title={user?.firstName ? `Welcome back, ${user.firstName}` : 'My account'}
        description="Your stays, invoices and payments, all in one place."
        action={
          <SiteLink to="/book" className={OUTLINE_BUTTON}>
            Book a stay
          </SiteLink>
        }
      />

      {error && <AccountError>{error}</AccountError>}

      {/* At-a-glance numbers */}
      <div className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-surface p-6">
            <p className="text-[10px] tracking-[0.24em] text-muted uppercase">
              {stat.label}
            </p>
            <p
              className={`mt-3 text-2xl font-semibold tracking-[-0.02em] ${
                stat.accent ? 'text-danger-ink' : 'text-ink'
              }`}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Next stay */}
      <section>
        <h2 className="text-[11px] tracking-[0.24em] text-muted uppercase">
          Your next stay
        </h2>

        {nextStay ? (
          <div className="mt-6 flex flex-col gap-6 border border-line p-7 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xl font-semibold tracking-[-0.01em] uppercase">
                {formatDate(nextStay.checkInDate)} — {formatDate(nextStay.checkOutDate)}
              </p>
              <p className="mt-2 text-sm text-muted">
                {nightsBetween(nextStay.checkInDate, nextStay.checkOutDate)}{' '}
                {nightsBetween(nextStay.checkInDate, nextStay.checkOutDate) === 1
                  ? 'night'
                  : 'nights'}{' '}
                · {nextStay.numberOfGuests}{' '}
                {nextStay.numberOfGuests === 1 ? 'guest' : 'guests'}
              </p>
            </div>

            <div className="flex items-center gap-5">
              <StatusPill status={nextStay.status} />
              <SiteLink
                to={`/reservations/${nextStay.reservationId}`}
                className="text-[11px] tracking-[0.2em] text-muted uppercase transition-colors duration-300 hover:text-ink"
              >
                View →
              </SiteLink>
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <AccountEmpty
              title="No upcoming stays"
              hint="When you book a room it will appear here."
            />
          </div>
        )}
      </section>

      {/* Section links */}
      <section className="grid gap-px border border-line bg-line sm:grid-cols-3">
        {[
          { label: 'Reservations', to: '/account/reservations', hint: 'Your stays and their status' },
          { label: 'Invoices', to: '/account/invoices', hint: 'Charges and balances' },
          { label: 'Payments', to: '/account/payments', hint: 'What you have paid' },
        ].map((link) => (
          <SiteLink
            key={link.to}
            to={link.to}
            className="group bg-surface p-6 transition-colors duration-500 hover:bg-line/25"
          >
            <p className="text-[11px] tracking-[0.22em] uppercase">{link.label}</p>
            <p className="mt-2 text-xs text-muted">{link.hint}</p>
            <span className="mt-4 inline-block text-gold-ink transition-transform duration-500 group-hover:translate-x-1">
              →
            </span>
          </SiteLink>
        ))}
      </section>
    </div>
  );
}
