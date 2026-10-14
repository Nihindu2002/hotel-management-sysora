package com.hotel.hotel_management.security;

import com.hotel.hotel_management.user.User;
import org.springframework.security.core.Authentication;

import java.util.Map;

final class AuthenticatedUserResponse {
    private AuthenticatedUserResponse() {}

    static Map<String, String> from(Authentication authentication, String message) {
        AuthenticatedUser user = (AuthenticatedUser) authentication.getPrincipal();
        User profile = (User) authentication.getDetails();
        return Map.of("message", message, "uid", user.uid(),
                "email", user.email() == null ? "" : user.email(), "role", profile.getRole());
    }
}
