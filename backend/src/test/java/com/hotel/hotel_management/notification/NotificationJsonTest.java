package com.hotel.hotel_management.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pins the JSON shape of a notification.
 *
 * A boolean getter named {@code isRead()} is derived by Jackson as the property
 * "read", so without an explicit {@code @JsonProperty} the API would emit
 * {@code "read"} and every client reading {@code isRead} would see undefined —
 * making all notifications look unread. These tests fail if that regresses.
 */
class NotificationJsonTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void serializesReadFlagAsIsRead() throws Exception {
        Notification notification = new Notification();
        notification.setNotificationId("n1");
        notification.setRead(true);

        String json = objectMapper.writeValueAsString(notification);

        assertTrue(json.contains("\"isRead\":true"), "expected isRead in: " + json);
        assertFalse(json.contains("\"read\":"), "unexpected bare 'read' key in: " + json);
    }

    @Test
    void roundTripsTheDocumentedFields() throws Exception {
        Notification notification = new Notification();
        notification.setNotificationId("n2");
        notification.setUserUid("user-1");
        notification.setTitle("Payment received");
        notification.setMessage("Paid");
        notification.setType(NotificationType.PAYMENT);
        notification.setRead(false);
        notification.setLink("/my-payments");
        notification.setReferenceId("pay-1");

        String json = objectMapper.writeValueAsString(notification);
        Notification parsed = objectMapper.readValue(json, Notification.class);

        assertEquals("n2", parsed.getNotificationId());
        assertEquals("user-1", parsed.getUserUid());
        assertEquals("Payment received", parsed.getTitle());
        assertEquals(NotificationType.PAYMENT, parsed.getType());
        assertFalse(parsed.isRead());
        assertEquals("/my-payments", parsed.getLink());
        assertEquals("pay-1", parsed.getReferenceId());
    }
}
