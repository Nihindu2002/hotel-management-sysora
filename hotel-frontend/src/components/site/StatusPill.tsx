/**
 * Status badge in the brand palette.
 *
 * The enum values come from three different backend domains (reservations,
 * invoices, payments) but only ever mean three things to a guest: settled,
 * outstanding, or somewhere in between. Mapping by meaning rather than by
 * domain keeps the colour language consistent across the account pages.
 */

const SETTLED = new Set(['CONFIRMED', 'CHECKED_IN', 'PAID', 'COMPLETED']);
const OUTSTANDING = new Set(['CANCELLED', 'UNPAID', 'FAILED']);

const TONE_CLASS = {
  settled: 'border-success/40 bg-success/10 text-success-ink',
  outstanding: 'border-danger/40 bg-danger/10 text-danger-ink',
  pending: 'border-line text-muted',
} as const;

/** `PARTIALLY_PAID` → `Partially paid`, `CHECKED_IN` → `Checked in`. */
export function humanizeStatus(status: string): string {
  const words = status.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export default function StatusPill({ status }: { status: string }) {
  const tone = SETTLED.has(status)
    ? TONE_CLASS.settled
    : OUTSTANDING.has(status)
      ? TONE_CLASS.outstanding
      : TONE_CLASS.pending;

  return (
    <span
      className={`inline-block shrink-0 rounded-full border px-3 py-1 text-[10px] tracking-[0.18em] uppercase ${tone}`}
    >
      {humanizeStatus(status)}
    </span>
  );
}
