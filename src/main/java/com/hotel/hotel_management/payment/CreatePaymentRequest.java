package com.hotel.hotel_management.payment;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * A payment taken at the desk. The amount is validated against the invoice's
 * outstanding balance by the backend; the client cannot settle more than is
 * owed.
 */
public record CreatePaymentRequest(

        @NotBlank
        String invoiceId,

        @NotNull
        @DecimalMin(value = "0.01")
        Double amount,

        @NotNull
        PaymentMethod paymentMethod
) {
}
