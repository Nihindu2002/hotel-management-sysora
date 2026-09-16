package com.hotel.hotel_management.housekeeping;

import jakarta.validation.constraints.NotBlank;

public record AssignHousekeepingTaskRequest(

        @NotBlank
        String staffUid
) {
}

