package com.hotel.hotel_management.dashboard;

public record ReservationStatistics(
        long totalReservations,
        long pendingReservations,
        long confirmedReservations,
        long checkedInReservations,
        long checkedOutReservations,
        long cancelledReservations
) {
}

