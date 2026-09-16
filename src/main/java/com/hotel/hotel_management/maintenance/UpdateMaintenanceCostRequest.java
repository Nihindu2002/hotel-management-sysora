package com.hotel.hotel_management.maintenance;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public record UpdateMaintenanceCostRequest(
        @NotNull(message = "Actual cost is required")
        @DecimalMin(value = "0.0", message = "Actual cost cannot be negative")
        Double actualCost
) {
}

