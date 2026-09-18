import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
} from '../services/notificationService';
import { NOTIFICATION_META, formatRelativeTime } from '../utils/notificationMeta';
import type { AppNotification } from '../types/notification';

/** How often the badge re-checks while the app is open. */
const POLL_INTERVAL_MS = 60_000;
const PREVIEW_COUNT = 6;

export default function NotificationBell() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshCount = useCallback(async () => {
    try {
      setUnreadCount(await getUnreadCount());
    } catch {
      // A failed poll leaves the last known count rather than blanking the badge.
    }
  }, []);

  useEffect(() => {
    refreshCount();
    const timer = window.setInterval(refreshCount, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [refreshCount]);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await getNotifications();
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.isRead).length);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) loadNotifications();
  };

  // Close on outside click or Escape, matching typical dropdown behaviour.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleOpenNotification = async (notification: AppNotification) => {
    setOpen(false);

    if (!notification.isRead) {
      // Optimistic: the row is leaving the view either way, and a failed mark
      // should not block navigation.
      setNotifications((previous) =>
        previous.map((item) =>
          item.notificationId === notification.notificationId
            ? { ...item, isRead: true }
            : item
        )
      );
      setUnreadCount((count) => Math.max(0, count - 1));

      try {
        await markAsRead(notification.notificationId);
      } catch {
        refreshCount();
      }
    }

    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllAsRead();
      setNotifications((previous) => previous.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not mark all as read.');
    }
  };

  const preview = notifications.slice(0, PREVIEW_COUNT);
  const hasUnread = unreadCount > 0;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={
          hasUnread ? `Notifications, ${unreadCount} unread` : 'Notifications'
        }
        aria-expanded={open}
        className="relative rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>

        {hasUnread && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
              <p className="text-xs text-gray-500">
                {hasUnread ? `${unreadCount} unread` : 'You are all caught up'}
              </p>
            </div>

            {hasUnread && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Mark all as read
              </button>
            )}
          </div>

          {error && (
            <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                <span className="ml-2 text-sm text-gray-500">Loading…</span>
              </div>
            ) : preview.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-medium text-gray-700">No notifications</p>
                <p className="mt-1 text-xs text-gray-400">
                  Activity on your bookings and tasks will appear here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {preview.map((notification) => {
                  const meta = NOTIFICATION_META[notification.type];

                  return (
                    <li key={notification.notificationId}>
                      <button
                        type="button"
                        onClick={() => handleOpenNotification(notification)}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-gray-50 ${
                          notification.isRead ? '' : 'bg-indigo-50/40'
                        }`}
                      >
                        <span className={`mt-0.5 shrink-0 rounded-full border p-1.5 ${meta.cls}`}>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={meta.icon} />
                          </svg>
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span
                              className={`truncate text-sm ${
                                notification.isRead
                                  ? 'font-medium text-gray-700'
                                  : 'font-semibold text-gray-900'
                              }`}
                            >
                              {notification.title}
                            </span>
                            {!notification.isRead && (
                              <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-600" />
                            )}
                          </span>
                          <span className="mt-0.5 block line-clamp-2 text-xs text-gray-500">
                            {notification.message}
                          </span>
                          <span className="mt-1 block text-[11px] text-gray-400">
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-gray-100 px-4 py-3 text-center text-xs font-semibold text-indigo-600 hover:bg-gray-50 hover:text-indigo-800"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
