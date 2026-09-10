package com.hotel.hotel_management.reservation;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record CreateReservationRequest(

        @NotBlank
        String roomId,

        @NotNull
        @Future
        LocalDate checkInDate,

        @NotNull
        @Future
        LocalDate checkOutDate,

        @NotNull
        @Min(1)
        Integer numberOfGuests
) {
}