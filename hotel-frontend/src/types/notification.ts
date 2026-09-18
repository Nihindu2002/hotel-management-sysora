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
 * right destination depends on who is being told: a completed payment points a
 * customer at `/my-payments` but would point staff elsewhere.
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
