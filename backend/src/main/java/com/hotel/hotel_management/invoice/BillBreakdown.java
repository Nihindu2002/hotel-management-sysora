package com.hotel.hotel_management.invoice;

import java.util.List;

/**
 * The result of pricing a stay. Every field is derived by the backend; nothing
 * here is taken on trust from the client.
 */
public record BillBreakdown(
        long nights,
        double roomCharge,
        List<AdditionalCharge> additionalCharges,
        double additionalChargesTotal,
        double subtotal,
        DiscountType discountType,
        double discountValue,
        double discountAmount,
        double taxRate,
        double taxAmount,
        double totalAmount
) {
}
