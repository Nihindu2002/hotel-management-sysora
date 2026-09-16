package com.hotel.hotel_management.customer;

import com.hotel.hotel_management.reservation.Reservation;

import java.util.List;

public record CustomerDashboard(
        List<Reservation> upcomingReservations,
        CurrentStayResponse activeStay,
        long totalReservations,
        long pendingPayments
) {
}

