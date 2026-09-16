package com.hotel.hotel_management.dashboard;

public record InventoryStatistics(
        long totalItems,
        long activeItems,
        long inactiveItems,
        long lowStockItems
) {
}

