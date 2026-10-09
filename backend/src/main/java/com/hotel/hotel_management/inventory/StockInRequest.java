package com.hotel.hotel_management.inventory;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record StockInRequest(

        @NotBlank
        String itemId,

        @NotNull
        @DecimalMin(value = "0.01")
        Double quantity,

        @DecimalMin(value = "0.0")
        Double unitCost,

        String reference,

        String notes
) {
}

