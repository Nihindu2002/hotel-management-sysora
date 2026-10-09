package com.hotel.hotel_management.reservation;

import com.hotel.hotel_management.invoice.AdditionalCharge;
import com.hotel.hotel_management.invoice.DiscountType;

import java.util.List;

/**
 * What the desk enters on the Generate Final Bill screen before confirming a
 * checkout: the extra charges it has added and any discount it has applied.
 *
 * Deliberately carries no total. The bill is priced by the backend from these
 * inputs plus the reservation's own dates and the room's rate, so the amount
 * shown on screen can never be dictated by the client.
 */
public record CheckoutBillRequest(

        List<AdditionalCharge> additionalCharges,

        DiscountType discountType,

        Double discountValue
) {
}
