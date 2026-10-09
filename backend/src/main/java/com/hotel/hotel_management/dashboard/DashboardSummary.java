package com.hotel.hotel_management.dashboard;

public record DashboardSummary(
        RoomStatistics roomStatistics,
        ReservationStatistics reservationStatistics,
        FinanceStatistics financeStatistics,
        InventoryStatistics inventoryStatistics,
        HousekeepingStatistics housekeepingStatistics,
        MaintenanceStatistics maintenanceStatistics
) {
}

