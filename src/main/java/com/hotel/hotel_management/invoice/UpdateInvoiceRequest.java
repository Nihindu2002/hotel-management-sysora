package com.hotel.hotel_management.invoice;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public record UpdateInvoiceRequest(

        @NotNull
        @DecimalMin(value = "0.0")
        Double additionalCharges,

        @NotNull
        @DecimalMin(value = "0.0")
        Double discount
) {}