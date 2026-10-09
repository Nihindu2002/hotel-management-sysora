package com.hotel.hotel_management.dashboard;

public record RoomStatistics(
        long totalRooms,
        long availableRooms,
        long reservedRooms,
        long occupiedRooms,
        long cleaningRooms,
        long maintenanceRooms
) {
}

