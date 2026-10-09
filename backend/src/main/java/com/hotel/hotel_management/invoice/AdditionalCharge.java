package com.hotel.hotel_management.invoice;

/**
 * One line on the bill that is not the room itself — an extra bed, laundry,
 * room service, minibar.
 *
 * Charges are stored as {@code description}/{@code amount} pairs rather than
 * folded into a single total so the printed invoice can show how the figure was
 * arrived at.
 */
public record AdditionalCharge(String description, double amount) {

    public static AdditionalCharge of(String description, double amount) {
        return new AdditionalCharge(description, amount);
    }
}
