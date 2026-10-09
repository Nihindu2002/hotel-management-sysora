package com.hotel.hotel_management.user;

/** Acknowledgement that a staff login was provisioned. */
public record CreateUserResponse(
        String message,
        String uid,
        String email,
        String role
) {
}
