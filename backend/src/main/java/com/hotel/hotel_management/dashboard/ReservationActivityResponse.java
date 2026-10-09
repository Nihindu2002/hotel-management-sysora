package com.hotel.hotel_management.dashboard;

/**
 * Reservation figures anchored to a specific day, which the all-time status
 * counts in {@link ReservationStatistics} cannot express.
 *
 * {@code todayReservations} counts bookings created today;
 * {@code todayArrivals} and {@code todayDepartures} count stays scheduled for
 * today. Cancelled reservations are excluded from the arrival and departure
 * counts but still appear in {@code todayReservations}.
 */
public record ReservationActivityResponse(
        long todayReservations,
        long todayArrivals,
        long todayDepartures,
        long pendingReservations,
        long confirmedReservations,
        long currentlyCheckedIn
) {
}
