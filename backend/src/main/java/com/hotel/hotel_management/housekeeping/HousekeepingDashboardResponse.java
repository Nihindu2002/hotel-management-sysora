package com.hotel.hotel_management.housekeeping;

/**
 * Housekeeping figures for the housekeeping dashboard.
 *
 * {@code completedToday} counts tasks completed since midnight, which the
 * all-time completed count cannot express. {@code roomsNeedingCleaning} is the
 * number of rooms currently in the CLEANING state — the work queue the
 * housekeeping team is actually looking at.
 */
public record HousekeepingDashboardResponse(
        long totalTasks,
        long pendingTasks,
        long assignedTasks,
        long inProgressTasks,
        long completedToday,
        long cancelledTasks,
        long roomsNeedingCleaning
) {
}
