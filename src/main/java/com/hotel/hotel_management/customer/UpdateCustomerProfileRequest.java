package com.hotel.hotel_management.customer;

import jakarta.validation.constraints.NotBlank;

public record UpdateCustomerProfileRequest(
        @NotBlank(message = "First name is required")
        String firstName,

        @NotBlank(message = "Last name is required")
        String lastName,

        String phone
) {
}

