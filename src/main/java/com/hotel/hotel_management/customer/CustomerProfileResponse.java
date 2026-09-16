package com.hotel.hotel_management.customer;

import java.time.Instant;

public record CustomerProfileResponse(
        String uid,
        String email,
        String firstName,
        String lastName,
        String phone,
        String role,
        Instant createdAt
) {
}

