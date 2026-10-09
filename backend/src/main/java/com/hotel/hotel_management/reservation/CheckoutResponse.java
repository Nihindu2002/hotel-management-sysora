package com.hotel.hotel_management.reservation;

import com.hotel.hotel_management.invoice.Invoice;

/**
 * The outcome of a completed checkout: the reservation in its new CHECKED_OUT
 * state and the settled bill.
 */
public record CheckoutResponse(Reservation reservation, Invoice invoice) {
}
