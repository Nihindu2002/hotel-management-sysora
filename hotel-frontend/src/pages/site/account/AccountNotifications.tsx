import { useEffect, useState } from 'react';
import {
  AccountEmpty,
  AccountError,
  AccountHeading,
  AccountLoading,
} from '../../../components/site/AccountPage';
import SiteLink from '../../../components/site/SiteLink';
import {
  getNotifications,
  markAllAsRead,
  markAsRead,
} from '../../../services/notificationService';
import type { AppNotification } from '../../../types/notification';
import { NOTIFICATION_META, formatRelativeTime } from '../../../utils/notificationMeta';

/**
 * The customer's notification list, in the site's visual language: a plain
 * ledger of messages rather than the dashboard's coloured chips. Unread is
 * carried by a single gold dot.
 */
export default function AccountNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let ignore = false;

    getNotifications()
      .then((data) => {
        if (!ignore) setNotifications(data ?? []);
      })
      .catch((err: any) => {
        if (!ignore) {
          setError(err?.response?.data?.message || 'We could not load your notifications.');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleMarkAll = async () => {
    setBusy(true);
    try {
      await markAllAsRead();
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'We could not mark these as read.');
    } finally {
      setBusy(false);
    }
  };

  const handleMarkOne = async (notification: AppNotification) => {
    if (notification.isRead) return;

    try {
      await markAsRead(notification.notificationId);
      setNotifications((current) =>
        current.map((item) =>
          item.notificationId === notification.notificationId ? { ...item, isRead: true } : item,
        ),
      );
    } catch {
      // A failed mark-as-read is not worth interrupting the guest over; the
      // item simply stays unread and can be retried.
    }
  };

  if (loading) return <AccountLoading label="Loading your notifications…" />;

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  return (
    <div className="space-y-12">
      <AccountHeading
        eyebrow="Inbox"
        title="Notifications"
        description="Updates about your reservations, payments and account."
        action={
          unreadCount > 0 ? (
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={busy}
              className="rounded-full border border-line px-7 py-3 text-[11px] tracking-[0.22em] text-ink uppercase transition-colors duration-500 hover:border-navy hover:bg-royal hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Marking…' : `Mark all read (${unreadCount})`}
            </button>
          ) : undefined
        }
      />

      {error && <AccountError>{error}</AccountError>}

      {notifications.length === 0 && !error ? (
        <AccountEmpty title="Nothing here yet" hint="Updates about your stays will arrive here." />
      ) : (
        <ul>
          {notifications.map((notification) => {
            const meta = NOTIFICATION_META[notification.type];

            return (
              <li
                key={notification.notificationId}
                className="border-b border-line py-6 first:border-t"
              >
                <div className="flex items-start gap-4">
                  <span
                    aria-hidden="true"
                    className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${
                      notification.isRead ? 'bg-transparent' : 'bg-navy'
                    }`}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      <p
                        className={`text-sm ${
                          notification.isRead ? 'text-muted' : 'font-semibold text-ink'
                        }`}
                      >
                        {notification.title}
                      </p>
                      <p className="text-[10px] tracking-[0.24em] text-muted uppercase">
                        {meta?.label ?? notification.type}
                      </p>
                      <p className="ml-auto text-xs text-muted">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>

                    <p className="mt-2 max-w-2xl text-sm leading-[1.9] text-muted">
                      {notification.message}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-6">
                      {/* The backend decides the destination, so it is followed
                          as given — old /my-* paths still redirect. */}
                      {notification.link && (
                        <SiteLink
                          to={notification.link}
                          className="text-[11px] tracking-[0.2em] text-gold-ink uppercase transition-colors duration-300 hover:text-ink"
                        >
                          View →
                        </SiteLink>
                      )}

                      {!notification.isRead && (
                        <button
                          type="button"
                          onClick={() => handleMarkOne(notification)}
                          className="text-[11px] tracking-[0.2em] text-muted uppercase transition-colors duration-300 hover:text-ink"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
