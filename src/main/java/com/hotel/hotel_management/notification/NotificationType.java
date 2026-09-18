package com.hotel.hotel_management.notification;

/**
 * What produced a notification. Stored as a string in Firestore, so the wire
 * values are these names.
 */
public enum NotificationType {
    RESERVATION,
    PAYMENT,
    HOUSEKEEPING,
    MAINTENANCE,
    INVENTORY,
    SYSTEM
}
