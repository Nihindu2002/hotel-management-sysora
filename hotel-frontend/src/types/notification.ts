export type NotificationType =
  | 'RESERVATION'
  | 'PAYMENT'
  | 'HOUSEKEEPING'
  | 'MAINTENANCE'
  | 'INVENTORY'
  | 'SYSTEM';

/**
 * A notification addressed to the signed-in user.
 *
 * Named `AppNotification` rather than `Notification` so it does not shadow the
 * DOM's global `Notification` type.
 *
 * `link` is decided by the backend when the notification is created, because the
 * right destination depends on which role is being told — a checkout-cleaning
 * task points housekeeping at their queue, a new booking points the front desk
 * at the reservations list.
 */
export interface AppNotification {
  notificationId: string;
  userUid: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  link?: string | null;
  referenceId?: string | null;
  createdAt: string;
}
