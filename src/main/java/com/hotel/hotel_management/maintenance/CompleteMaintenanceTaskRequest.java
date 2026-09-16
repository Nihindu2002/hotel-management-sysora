package com.hotel.hotel_management.maintenance;

import jakarta.validation.constraints.DecimalMin;

public record CompleteMaintenanceTaskRequest(
        @DecimalMin(value = "0.0", message = "Actual cost cannot be negative")
        Double actualCost
) {
}

