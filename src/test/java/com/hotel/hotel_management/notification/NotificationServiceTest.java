package com.hotel.hotel_management.notification;

import com.hotel.hotel_management.common.ForbiddenException;
import com.hotel.hotel_management.user.Role;
import com.hotel.hotel_management.user.User;
import com.hotel.hotel_management.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class NotificationServiceTest {

    private NotificationRepository notificationRepository;
    private UserRepository userRepository;
    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationRepository = mock(NotificationRepository.class);
        userRepository = mock(UserRepository.class);
        notificationService = new NotificationService(notificationRepository, userRepository);
    }

    // ── Reads are scoped to the caller ──

    @Test
    void getNotifications_ReturnsOnlyThatUsersNotifications() {
        when(notificationRepository.findByUserUid("user-a"))
                .thenReturn(List.of(notification("n1", "user-a", false)));

        List<Notification> result = notificationService.getNotifications("user-a");

        assertEquals(1, result.size());
        verify(notificationRepository).findByUserUid("user-a");
        verify(notificationRepository, never()).findByUserUid("user-b");
    }

    @Test
    void getNotifications_RejectsMissingIdentity() {
        assertThrows(ForbiddenException.class, () -> notificationService.getNotifications(null));
        verify(notificationRepository, never()).findByUserUid(anyString());
    }

    @Test
    void getUnreadCount_CountsOnlyUnread() {
        when(notificationRepository.findByUserUid("user-a")).thenReturn(List.of(
                notification("n1", "user-a", false),
                notification("n2", "user-a", true),
                notification("n3", "user-a", false)));

        assertEquals(2, notificationService.getUnreadCount("user-a"));
    }

    @Test
    void getUnreadCount_EmptyMailboxIsZero() {
        when(notificationRepository.findByUserUid("user-a")).thenReturn(List.of());

        assertEquals(0, notificationService.getUnreadCount("user-a"));
    }

    // ── Ownership ──

    @Test
    void markAsRead_RefusesAnotherUsersNotification() {
        when(notificationRepository.findById("n1"))
                .thenReturn(Optional.of(notification("n1", "owner", false)));

        assertThrows(ForbiddenException.class,
                () -> notificationService.markAsRead("intruder", "n1"));

        verify(notificationRepository, never()).updateReadStatus(anyString(), anyBoolean());
    }

    @Test
    void markAsRead_MarksOwnNotification() {
        Notification existing = notification("n1", "owner", false);
        Notification updated = notification("n1", "owner", true);

        when(notificationRepository.findById("n1")).thenReturn(Optional.of(existing));
        when(notificationRepository.updateReadStatus("n1", true)).thenReturn(updated);

        Notification result = notificationService.markAsRead("owner", "n1");

        assertTrue(result.isRead());
        verify(notificationRepository).updateReadStatus("n1", true);
    }

    @Test
    void markAsRead_AlreadyReadDoesNotWriteAgain() {
        when(notificationRepository.findById("n1"))
                .thenReturn(Optional.of(notification("n1", "owner", true)));

        Notification result = notificationService.markAsRead("owner", "n1");

        assertTrue(result.isRead());
        verify(notificationRepository, never()).updateReadStatus(anyString(), anyBoolean());
    }

    @Test
    void markAsRead_UnknownIdFails() {
        when(notificationRepository.findById("missing")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> notificationService.markAsRead("owner", "missing"));
    }

    @Test
    void markAllAsRead_OnlyTouchesTheCallersMailbox() {
        when(notificationRepository.findByUserUid("owner"))
                .thenReturn(List.of(notification("n1", "owner", false)));
        when(notificationRepository.markAllRead(any())).thenReturn(1);

        assertEquals(1, notificationService.markAllAsRead("owner"));

        verify(notificationRepository).findByUserUid("owner");
        verify(notificationRepository, never()).findByUserUid("someone-else");
    }

    // ── Emission ──

    @Test
    void emit_CreatesUnreadNotificationWithLinkAndReference() {
        notificationService.emit(
                "user-a",
                NotificationType.PAYMENT,
                "Payment received",
                "Paid",
                "/my-payments",
                "pay-1");

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());

        Notification saved = captor.getValue();
        assertEquals("user-a", saved.getUserUid());
        assertEquals(NotificationType.PAYMENT, saved.getType());
        assertEquals("Payment received", saved.getTitle());
        assertEquals("/my-payments", saved.getLink());
        assertEquals("pay-1", saved.getReferenceId());
        assertFalse(saved.isRead());
        assertTrue(saved.getNotificationId() != null && !saved.getNotificationId().isBlank());
        assertTrue(saved.getCreatedAt() != null);
    }

    @Test
    void emit_IgnoresUnknownRecipient() {
        notificationService.emit(null, NotificationType.SYSTEM, "t", "m", null, null);
        notificationService.emit("  ", NotificationType.SYSTEM, "t", "m", null, null);

        verify(notificationRepository, never()).save(any());
    }

    /**
     * A notification is a side effect of the operation that triggered it, so a
     * storage failure must not propagate to the caller and fail that operation.
     */
    @Test
    void emit_SwallowsStorageFailure() {
        when(notificationRepository.save(any()))
                .thenThrow(new IllegalStateException("Firestore down"));

        notificationService.emit("user-a", NotificationType.SYSTEM, "t", "m", null, null);

        verify(notificationRepository).save(any());
    }

    // ── Role fan-out ──

    @Test
    void emitToRoles_TargetsOnlyMatchingEnabledUsers() {
        when(userRepository.findAll()).thenReturn(List.of(
                user("admin-1", Role.ADMIN, true),
                user("admin-2", Role.ADMIN, false),
                user("manager-1", Role.MANAGER, true),
                user("customer-1", Role.CUSTOMER, true)));

        notificationService.emitToRoles(
                Set.of(Role.ADMIN, Role.MANAGER),
                NotificationType.INVENTORY,
                "Low stock",
                "Widget is low",
                "/inventory/items/i1",
                "i1");

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, org.mockito.Mockito.times(2)).save(captor.capture());

        List<String> recipients = captor.getAllValues().stream()
                .map(Notification::getUserUid)
                .sorted()
                .toList();

        // The disabled admin and the customer are both excluded.
        assertEquals(List.of("admin-1", "manager-1"), recipients);
    }

    @Test
    void emitToRoles_SwallowsLookupFailure() {
        when(userRepository.findAll()).thenThrow(new IllegalStateException("Firestore down"));

        notificationService.emitToRoles(
                Set.of(Role.ADMIN), NotificationType.INVENTORY, "t", "m", null, null);

        verify(notificationRepository, never()).save(any());
    }

    @Test
    void emitToRoles_NoMatchingUsersWritesNothing() {
        when(userRepository.findAll()).thenReturn(List.of(user("customer-1", Role.CUSTOMER, true)));

        notificationService.emitToRoles(
                Set.of(Role.ADMIN), NotificationType.INVENTORY, "t", "m", null, null);

        verify(notificationRepository, never()).save(any());
    }

    @Test
    void emitToRoles_SkipsUsersWithNoRole() {
        User roleless = new User();
        roleless.setUid("no-role");
        roleless.setEnabled(true);

        when(userRepository.findAll()).thenReturn(List.of(roleless));

        notificationService.emitToRoles(
                Set.of(Role.ADMIN), NotificationType.INVENTORY, "t", "m", null, null);

        verify(notificationRepository, never()).save(any());
    }

    // ── Helpers ──

    private Notification notification(String id, String userUid, boolean isRead) {
        Notification notification = new Notification();
        notification.setNotificationId(id);
        notification.setUserUid(userUid);
        notification.setType(NotificationType.SYSTEM);
        notification.setTitle("title");
        notification.setMessage("message");
        notification.setRead(isRead);
        notification.setCreatedAt(Instant.parse("2026-09-01T10:00:00Z"));
        return notification;
    }

    private User user(String uid, Role role, boolean enabled) {
        User user = new User();
        user.setUid(uid);
        user.setRole(role.name());
        user.setEnabled(enabled);
        return user;
    }
}
