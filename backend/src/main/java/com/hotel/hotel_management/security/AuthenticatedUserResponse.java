package com.hotel.hotel_management.security;

import com.google.firebase.auth.FirebaseToken;
import com.hotel.hotel_management.user.User;
import org.springframework.security.core.Authentication;

import java.util.Map;

final class AuthenticatedUserResponse {

    private AuthenticatedUserResponse() {
    }

    static Map<String, String> from(Authentication authentication, String message) {
        FirebaseToken token = (FirebaseToken) authentication.getPrincipal();
        User profile = (User) authentication.getDetails();
        return Map.of(
                "message", message,
                "uid", token.getUid(),
                "email", token.getEmail() == null ? "" : token.getEmail(),
                "role", profile.getRole());
    }
}