package com.hotel.hotel_management.maintenance;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateMaintenanceTaskRequest(

        @NotBlank
        String roomId,

        @NotNull
        MaintenanceIssueType issueType,

        @NotNull
        MaintenancePriority priority,

        @NotBlank
        String description
) {
}

