package com.hotel.hotel_management.housekeeping;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record InventoryItemUsage(
        @NotBlank String itemId,
        @NotNull @DecimalMin("0.01") Double quantity) {}
