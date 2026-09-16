package com.hotel.hotel_management.inventory;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateInventoryItemRequest(

        @NotBlank
        String itemName,

        @NotNull
        InventoryCategory category,

        String description,

        @NotNull
        InventoryUnit unit,

        @NotNull
        @DecimalMin(value = "0.0")
        Double minimumStock,

        @NotNull
        @DecimalMin(value = "0.0")
        Double unitCost,

        String supplierId
) {
}

