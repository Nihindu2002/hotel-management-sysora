package com.hotel.hotel_management.maintenance;

public record MaintenanceDashboardResponse(
        long pendingTasks,
        long assignedTasks,
        long inProgressTasks,
        long completedToday,
        long highPriorityActiveTasks,
        long cancelledTasks,
        long totalTasks,
        double totalMaintenanceCost
) {
}
