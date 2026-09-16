package com.hotel.hotel_management.dashboard;

public record HousekeepingStatistics(
        long totalTasks,
        long pendingTasks,
        long assignedTasks,
        long inProgressTasks,
        long completedTasks,
        long cancelledTasks
) {
}

