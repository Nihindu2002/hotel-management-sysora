package com.hotel.hotel_management.inventory;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record StockOutRequest(

        @NotBlank
        String itemId,

        @NotNull
        @DecimalMin(value = "0.01")
        Double quantity,

        String reference,

        String notes
) {
}

