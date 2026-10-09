package com.hotel.hotel_management.auth;

public record LoginResponse(
        String message,
        String idToken,
        String refreshToken,
        String localId,
        String email,
        String expiresIn
) {
}