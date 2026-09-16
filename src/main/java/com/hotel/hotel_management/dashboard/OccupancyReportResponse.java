package com.hotel.hotel_management.dashboard;

public record OccupancyReportResponse(
        long totalRooms,
        long occupiedRooms,
        double occupancyRate
) {
}

