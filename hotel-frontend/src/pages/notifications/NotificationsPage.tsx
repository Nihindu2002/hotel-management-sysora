import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getNotifications,
  markAllAsRead,
  markAsRead,
} from '../../services/notificationService';
import {
  NOTIFICATION_META,
  NOTIFICATION_TYPES,
  formatFullTimestamp,
  formatRelativeTime,
} from '../../utils/notificationMeta';
import type { AppNotification, NotificationType } from '../../types/notification';

type ReadFilter = 'ALL' | 'UNREAD' | 'READ';

const READ_FILTERS: { value: ReadFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'UNREAD', label: 'Unread' },
  { value: 'READ', label: 'Read' },
];

export default function NotificationsPage() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [readFilter, setReadFilter] = useState<ReadFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'ALL'>('ALL');

  const loadNotifications = useCallback(async () => {
    try {
      setError(null);
      setNotifications(await getNotifications());
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const filtered = useMemo(
    () =>
      notifications.filter((notification) => {
        if (readFilter === 'UNREAD' && notification.isRead) return false;
        if (readFilter === 'READ' && !notification.isRead) return false;
        if (typeFilter !== 'ALL' && notification.type !== typeFilter) return false;
        return true;
      }),
    [notifications, readFilter, typeFilter]
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const handleMarkRead = async (notification: AppNotification) => {
    if (notification.isRead) return;

    try {
      setBusyId(notification.notificationId);
      await markAsRead(notification.notificationId);
      setNotifications((previous) =>
        previous.map((item) =>
          item.notificationId === notification.notificationId
            ? { ...item, isRead: true }
            : item
        )
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to mark the notification as read.');
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllAsRead();
      setNotifications((previous) => previous.map((n) => ({ ...n, isRead: true })));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to mark all as read.');
    }
  };

  const handleOpen = async (notification: AppNotification) => {
    await handleMarkRead(notification);
    if (notification.link) navigate(notification.link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="mt-1 text-sm text-gray-600">
            Activity on your bookings, payments, and tasks.
          </p>
        </div>

        <button
          type="button"
          onClick={handleMarkAll}
          disabled={unreadCount === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Mark all as read
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-2">
            {READ_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setReadFilter(option.value)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  readFilter === option.value
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {option.label}
                {option.value === 'UNREAD' && unreadCount > 0 && (
                  <span
                    className={`ml-2 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                      readFilter === 'UNREAD'
                        ? 'bg-white/20 text-white'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as NotificationType | 'ALL')
              }
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Types</option>
              {NOTIFICATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {NOTIFICATION_META[type].label}
                </option>
              ))}
            </select>
          </div>

          <p className="ml-auto text-xs font-medium text-gray-500">
            {filtered.length} of {notifications.length}
          </p>
        </div>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <span className="ml-3 text-sm text-gray-500">Loading notifications…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-sm font-medium text-gray-700">
              {notifications.length === 0
                ? 'No notifications yet'
                : 'Nothing matches these filters'}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {notifications.length === 0
                ? 'Completing a payment, confirming a reservation, or being assigned a task will show up here.'
                : 'Try switching the read or type filter.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filtered.map((notification) => {
              const meta = NOTIFICATION_META[notification.type];

              return (
                <li
                  key={notification.notificationId}
                  className={`flex items-start gap-4 px-5 py-4 transition ${
                    notification.isRead ? '' : 'bg-indigo-50/40'
                  }`}
                >
                  <span className={`mt-0.5 shrink-0 rounded-full border p-2 ${meta.cls}`}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={meta.icon} />
                    </svg>
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={`text-sm ${
                          notification.isRead
                            ? 'font-medium text-gray-700'
                            : 'font-bold text-gray-900'
                        }`}
                      >
                        {notification.title}
                      </h3>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.cls}`}
                      >
                        {meta.label}
                      </span>
                      {!notification.isRead && (
                        <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                          Unread
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-gray-600">{notification.message}</p>

                    <p className="mt-1.5 text-xs text-gray-400" title={formatFullTimestamp(notification.createdAt)}>
                      {formatRelativeTime(notification.createdAt)}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {notification.link && (
                      <button
                        type="button"
                        onClick={() => handleOpen(notification)}
                        className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                      >
                        Open
                      </button>
                    )}

                    {!notification.isRead && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(notification)}
                        disabled={busyId === notification.notificationId}
                        className="text-xs font-medium text-gray-500 hover:text-gray-800 disabled:opacity-50"
                      >
                        {busyId === notification.notificationId
                          ? 'Marking…'
                          : 'Mark as read'}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
