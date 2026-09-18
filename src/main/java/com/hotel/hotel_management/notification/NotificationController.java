package com.hotel.hotel_management.notification;

import com.google.firebase.auth.FirebaseToken;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Notifications for the signed-in user only.
 *
 * Every endpoint takes the uid from the Firebase token rather than from the URL,
 * and the service re-checks ownership before mutating, so there is no path that
 * exposes or edits another user's notifications.
 */
@Tag(name = "Notifications", description = "Per-user notifications and read state")
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @Operation(summary = "Get my notifications", description = "Returns the authenticated user's notifications, newest first")
    @GetMapping
    public List<Notification> getNotifications(
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token) {

        return notificationService.getNotifications(requireUid(token));
    }

    @Operation(summary = "Get my unread count", description = "Returns how many of the authenticated user's notifications are unread")
    @GetMapping("/unread-count")
    public UnreadCountResponse getUnreadCount(
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token) {

        return new UnreadCountResponse(notificationService.getUnreadCount(requireUid(token)));
    }

    @Operation(summary = "Mark a notification as read", description = "Marks one of the authenticated user's own notifications as read")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Notification marked read"),
            @ApiResponse(responseCode = "403", description = "Notification belongs to another user"),
            @ApiResponse(responseCode = "404", description = "Notification not found")
    })
    @PatchMapping("/{notificationId}/read")
    public Notification markAsRead(
            @PathVariable String notificationId,
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token) {

        return notificationService.markAsRead(requireUid(token), notificationId);
    }

    @Operation(summary = "Mark all my notifications as read", description = "Marks every unread notification for the authenticated user as read")
    @PatchMapping("/read-all")
    public MarkAllReadResponse markAllAsRead(
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token) {

        return new MarkAllReadResponse(notificationService.markAllAsRead(requireUid(token)));
    }

    private String requireUid(FirebaseToken token) {
        if (token == null) {
            throw new BadCredentialsException("Not authenticated");
        }
        return token.getUid();
    }
}
