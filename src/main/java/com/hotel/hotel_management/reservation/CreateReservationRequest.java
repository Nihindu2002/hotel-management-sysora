package com.hotel.hotel_management.reservation;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * A booking taken at the front desk.
 *
 * The occupant's name and phone number are required — they are what identifies
 * the stay on the desk's own screens. Email is optional because the hotel does
 * not email occupants anything today.
 */
public record CreateReservationRequest(

        @NotBlank
        String roomId,

        @NotBlank
        @Size(max = 120)
        String customerName,

        @NotBlank
        @Size(max = 30)
        @Pattern(
                regexp = "^[+]?[0-9 ()-]{7,20}$",
                message = "Phone number must be 7-20 digits and may contain + ( ) - and spaces")
        String customerPhone,

        @jakarta.validation.constraints.Email
        @Size(max = 120)
        String customerEmail,

        @NotNull
        @FutureOrPresent
        LocalDate checkInDate,

        @NotNull
        LocalDate checkOutDate,

        @NotNull
        @Min(1)
        Integer numberOfGuests,

        BoardPackage boardPackage
) {
    public CreateReservationRequest(
            String roomId,
            String customerName,
            String customerPhone,
            String customerEmail,
            LocalDate checkInDate,
            LocalDate checkOutDate,
            Integer numberOfGuests) {
        this(roomId, customerName, customerPhone, customerEmail,
                checkInDate, checkOutDate, numberOfGuests, null);
    }
}
