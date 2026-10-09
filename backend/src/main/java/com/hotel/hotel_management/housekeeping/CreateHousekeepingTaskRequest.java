package com.hotel.hotel_management.housekeeping;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateHousekeepingTaskRequest(

        @NotBlank
        String roomId,

        @NotNull
        HousekeepingTaskType taskType,

        @NotNull
        HousekeepingTaskPriority priority,

        String notes
) {
}

