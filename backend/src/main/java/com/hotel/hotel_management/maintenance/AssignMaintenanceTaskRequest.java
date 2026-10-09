package com.hotel.hotel_management.maintenance;

import jakarta.validation.constraints.NotBlank;

public record AssignMaintenanceTaskRequest(

        @NotBlank
        String staffUid
) {
}

