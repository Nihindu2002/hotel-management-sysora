import type { ActivityType } from '../../types/dashboard';
import type { ReservationStatus } from '../../types/reservation';
import type { RoomStatus } from '../../types/room';

/**
 * Money and date formatting is imported from the finance feature rather than
 * copied a fourth time — the dashboard and reports display the same LKR figures
 * the finance pages do, so they should render identically.
 */
export { formatCurrency, formatDate, formatDateTime } from '../finance/financeMeta';

export const ACTIVITY_META: Record<
  ActivityType,
  { label: string; cls: string; icon: string }
> = {
  RESERVATION: {
    label: 'Reservation',
    cls: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
  },
  PAYMENT: {
    label: 'Payment',
    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-6.75 4.5h16.5A2.25 2.25 0 0021.75 18.5V6.75A2.25 2.25 0 0019.5 4.5H4.5A2.25 2.25 0 002.25 6.75v11.75A2.25 2.25 0 004.5 21z',
  },
  REFUND: {
    label: 'Refund',
    cls: 'bg-rose-100 text-rose-700 border-rose-200',
    icon: 'M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3',
  },
  INVENTORY: {
    label: 'Inventory',
    cls: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z',
  },
  MAINTENANCE: {
    label: 'Maintenance',
    cls: 'bg-orange-100 text-orange-700 border-orange-200',
    icon: 'M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.32l-3.276 3.277a1.5 1.5 0 01-2.121-2.122l3.276-3.275a4.5 4.5 0 00-6.32 4.486c.048.58.024 1.193-.14 1.743',
  },
  OTHER: {
    label: 'Activity',
    cls: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
  },
};

export const ROOM_STATUS_META: Record<
  RoomStatus,
  { label: string; cls: string; bar: string }
> = {
  AVAILABLE: {
    label: 'Available',
    cls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    bar: 'bg-emerald-500',
  },
  RESERVED: {
    label: 'Reserved',
    cls: 'bg-blue-100 text-blue-800 border-blue-200',
    bar: 'bg-blue-500',
  },
  OCCUPIED: {
    label: 'Occupied',
    cls: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    bar: 'bg-indigo-500',
  },
  CLEANING: {
    label: 'Cleaning',
    cls: 'bg-amber-100 text-amber-800 border-amber-200',
    bar: 'bg-amber-500',
  },
  MAINTENANCE: {
    label: 'Maintenance',
    cls: 'bg-red-100 text-red-800 border-red-200',
    bar: 'bg-red-500',
  },
};

export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CHECKED_IN: 'Checked In',
  CHECKED_OUT: 'Checked Out',
  CANCELLED: 'Cancelled',
};
