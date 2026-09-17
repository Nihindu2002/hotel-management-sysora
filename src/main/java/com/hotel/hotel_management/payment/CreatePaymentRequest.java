package com.hotel.hotel_management.payment;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreatePaymentRequest(

        @NotBlank
        String invoiceId,

        String reservationId,

        @NotNull
        @DecimalMin(value = "0.01")
        Double amount,

        @NotNull
        PaymentMethod paymentMethod
) {
    public CreatePaymentRequest(String invoiceId, Double amount, PaymentMethod paymentMethod) {
        this(invoiceId, null, amount, paymentMethod);
    }
}