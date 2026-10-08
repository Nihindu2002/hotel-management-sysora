package com.hotel.hotel_management.notification;

import com.hotel.hotel_management.common.ForbiddenException;
import com.hotel.hotel_management.user.Role;
import com.hotel.hotel_management.user.User;
import com.hotel.hotel_management.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(
            NotificationRepository notificationRepository,
            UserRepository userRepository) {

        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    // ── Reads (always scoped to the caller) ──

    public List<Notification> getNotifications(String userUid) {
        if (userUid == null) {
            throw new ForbiddenException("Not authenticated");
        }
        return notificationRepository.findByUserUid(userUid);
    }

    public long getUnreadCount(String userUid) {
        return getNotifications(userUid).stream()
                .filter(notification -> !notification.isRead())
                .count();
    }

    // ── Writes ──

    /**
     * Marks one notification read, refusing to touch a notification addressed to
     * somebody else. Without this check the endpoint would be an enumeration
     * hole: any signed-in user could flip another user's read state by id.
     */
    public Notification markAsRead(String userUid, String notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));

        if (!notification.getUserUid().equals(userUid)) {
            throw new ForbiddenException("Notification belongs to another user");
        }

        if (notification.isRead()) {
            return notification;
        }

        return notificationRepository.updateReadStatus(notificationId, true);
    }

    public int markAllAsRead(String userUid) {
        return notificationRepository.markAllRead(getNotifications(userUid));
    }

    // ── Emission ──

    /**
     * Creates a notification, swallowing any failure.
     *
     * Notifications are a side effect of the operation that triggered them, so a
     * notification problem must never fail a payment, a reservation, or a task
     * assignment. Failures are logged and otherwise ignored.
     */
    public void emit(
            String userUid,
            NotificationType type,
            String title,
            String message,
            String link,
            String referenceId) {

        if (userUid == null || userUid.isBlank()) {
            return;
        }

        try {
            Instant now = Instant.now();

            Notification notification = new Notification();
            notification.setNotificationId(UUID.randomUUID().toString());
            notification.setUserUid(userUid);
            notification.setTitle(title);
            notification.setMessage(message);
            notification.setType(type);
            notification.setRead(false);
            notification.setLink(link);
            notification.setReferenceId(referenceId);
            notification.setCreatedAt(now);

            notificationRepository.save(notification);
        } catch (RuntimeException exception) {
            log.warn("Failed to create {} notification for user {}", type, userUid, exception);
        }
    }

    /**
     * Sends the same notification to every active user holding one of the given
     * roles.
     *
     * Putting the fan-out here keeps role-targeting policy in one place and
     * means producers such as the inventory module do not need to know how to
     * enumerate users.
     */
    public void emitToRoles(
            Collection<Role> roles,
            NotificationType type,
            String title,
            String message,
            String link,
            String referenceId) {

        try {
            List<User> recipients = userRepository.findAll().stream()
                    .filter(user -> user.getRole() != null)
                    // User documents can outlive a role that has since been
                    // removed (for example CUSTOMER). Ignore those records so
                    // one legacy account cannot prevent notifications reaching
                    // every valid staff recipient.
                    .filter(user -> Role.isStaffRole(user.getRole()))
                    .filter(user -> roles.contains(
                            Role.valueOf(user.getRole().toUpperCase(Locale.ROOT))))
                    .filter(User::isEnabled)
                    .toList();

            for (User recipient : recipients) {
                emit(recipient.getUid(), type, title, message, link, referenceId);
            }
        } catch (RuntimeException exception) {
            log.warn("Failed to fan out {} notification to roles {}", type, roles, exception);
        }
    }
}
