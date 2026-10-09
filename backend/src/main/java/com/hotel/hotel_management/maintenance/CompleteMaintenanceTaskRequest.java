package com.hotel.hotel_management.maintenance;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

public record CompleteMaintenanceTaskRequest(
        @DecimalMin(value = "0.0", message = "Actual cost cannot be negative")
        Double actualCost,

        @Size(max = 1000, message = "Completion notes cannot exceed 1000 characters")
        String completionNotes
) {
}

