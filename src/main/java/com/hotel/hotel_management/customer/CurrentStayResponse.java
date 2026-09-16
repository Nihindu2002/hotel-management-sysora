package com.hotel.hotel_management.customer;

import com.hotel.hotel_management.reservation.Reservation;
import com.hotel.hotel_management.room.Room;

import java.time.LocalDate;

public record CurrentStayResponse(
        Reservation reservation,
        Room room,
        LocalDate checkInDate,
        LocalDate checkOutDate,
        Integer numberOfGuests
) {
}

