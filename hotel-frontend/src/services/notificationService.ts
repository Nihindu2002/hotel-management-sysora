import api from './api';
import type { AppNotification } from '../types/notification';

/**
 * The signed-in user's notifications, newest first.
 * Uses: GET /api/notifications
 *
 * The backend scopes every call to the uid in the Firebase token, so there is no
 * parameter that could point this at another user's mailbox.
 */
export const getNotifications = async (): Promise<AppNotification[]> => {
  const response = await api.get<AppNotification[]>('/notifications');
  return response.data;
};

/**
 * How many of the signed-in user's notifications are unread.
 * Uses: GET /api/notifications/unread-count
 */
export const getUnreadCount = async (): Promise<number> => {
  const response = await api.get<{ count: number }>('/notifications/unread-count');
  return response.data.count;
};

/**
 * Marks one notification as read.
 * Uses: PATCH /api/notifications/{notificationId}/read
 *
 * Rejects with 403 if the notification belongs to somebody else.
 */
export const markAsRead = async (
  notificationId: string
): Promise<AppNotification> => {
  const response = await api.patch<AppNotification>(
    `/notifications/${notificationId}/read`
  );
  return response.data;
};

/**
 * Marks all of the signed-in user's unread notifications as read.
 * Uses: PATCH /api/notifications/read-all
 */
export const markAllAsRead = async (): Promise<number> => {
  const response = await api.patch<{ updated: number }>('/notifications/read-all');
  return response.data.updated;
};
