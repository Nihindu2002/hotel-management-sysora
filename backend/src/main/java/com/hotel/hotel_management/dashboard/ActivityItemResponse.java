package com.hotel.hotel_management.dashboard;

import java.time.Instant;

/**
 * A single entry in the recent-activity feed.
 *
 * {@code activityType} is one of {@code RESERVATION}, {@code PAYMENT},
 * {@code REFUND}, {@code INVENTORY}, {@code MAINTENANCE} or {@code OTHER}, so
 * the client can pick an icon and label without re-deriving the category.
 * {@code referenceId} points at the underlying record when there is one.
 */
public record ActivityItemResponse(
        String activityType,
        String description,
        String referenceId,
        Instant timestamp
) {
}
