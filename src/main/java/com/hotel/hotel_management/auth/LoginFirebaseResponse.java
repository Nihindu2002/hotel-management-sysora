package com.hotel.hotel_management.auth;

public record LoginFirebaseResponse(
        String idToken,
        String refreshToken,
        String localId,
        String email,
        String expiresIn
) {
}
