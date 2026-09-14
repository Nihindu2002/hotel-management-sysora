package com.hotel.hotel_management.auth;

public record LoginFirebaseRequest(
        String email,
        String password,
        boolean returnSecureToken
) {
}
