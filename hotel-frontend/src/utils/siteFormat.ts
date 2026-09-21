import type { Invoice } from '../types/invoice';
import type { RoomType } from '../types/room';

/** `DELUXE` → `Deluxe`, `STANDARD` → `Standard`. */
export function roomTypeLabel(type: RoomType | string): string {
  const words = String(type).toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Money as the rest of the app renders it — two decimals with a `$` prefix. */
export function formatMoney(value: number | undefined | null): string {
  return `$${(value ?? 0).toFixed(2)}`;
}

/** `2026-09-20` → `20 Sep 2026`. Falls back to the raw string if unparseable. */
export function formatDate(value?: string): string {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** `2026-09-20T14:03:00Z` → `20 Sep 2026, 14:03`. */
export function formatDateTime(value?: string): string {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Whole nights between two `YYYY-MM-DD` dates, never less than one. */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 1;
}

/**
 * Paid and outstanding amounts for an invoice.
 *
 * The backend does not always populate `paidAmount` / `remainingAmount`, so
 * both fall back to what the status and total imply. Shared by the overview,
 * the invoice list and the invoice detail so they can never disagree.
 */
export function invoicePaidAndRemaining(invoice: Invoice): {
  paid: number;
  remaining: number;
} {
  const total = invoice.totalAmount ?? 0;

  const paid =
    invoice.paidAmount !== undefined
      ? invoice.paidAmount
      : invoice.status === 'PAID'
        ? total
        : 0;

  const remaining =
    invoice.remainingAmount !== undefined
      ? invoice.remainingAmount
      : Math.max(0, total - paid);

  return { paid, remaining };
}
