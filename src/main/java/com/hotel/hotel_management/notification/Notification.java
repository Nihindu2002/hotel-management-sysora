package com.hotel.hotel_management.notification;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;

/**
 * A message addressed to a single user.
 *
 * {@code link} holds the frontend path the notification should open, decided at
 * creation time because the right destination depends on who is being notified
 * — a completed payment points a customer at /my-payments but points staff at
 * /payments. {@code referenceId} keeps the originating record discoverable.
 */
public class Notification {

    private String notificationId;
    private String userUid;
    private String title;
    private String message;
    private NotificationType type;
    private boolean isRead;
    private String link;
    private String referenceId;
    private Instant createdAt;

    public String getNotificationId() {
        return notificationId;
    }

    public void setNotificationId(String notificationId) {
        this.notificationId = notificationId;
    }

    public String getUserUid() {
        return userUid;
    }

    public void setUserUid(String userUid) {
        this.userUid = userUid;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public NotificationType getType() {
        return type;
    }

    public void setType(NotificationType type) {
        this.type = type;
    }

    public String getLink() {
        return link;
    }

    public void setLink(String link) {
        this.link = link;
    }

    /**
     * Pinned to "isRead" on the wire.
     *
     * Jackson derives a boolean getter named {@code isRead()} as the property
     * "read", which would ship {@code {"read":true}} and leave clients reading
     * {@code isRead} with undefined. The API contract names this field
     * {@code isRead}, so the name is stated explicitly rather than inferred.
     */
    @JsonProperty("isRead")
    public boolean isRead() {
        return isRead;
    }

    @JsonProperty("isRead")
    public void setRead(boolean read) {
        isRead = read;
    }

    public String getReferenceId() {
        return referenceId;
    }

    public void setReferenceId(String referenceId) {
        this.referenceId = referenceId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
