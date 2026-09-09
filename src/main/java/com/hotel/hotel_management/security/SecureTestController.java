package com.hotel.hotel_management.security;

import com.google.firebase.auth.FirebaseToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class SecureTestController {

    @GetMapping("/api/secure-test")
    public Map<String, String> secureTest(Authentication authentication) {
        FirebaseToken token = (FirebaseToken) authentication.getPrincipal();
        return Map.of(
                "message", "Authentication successful",
                "uid", token.getUid(),
                "email", token.getEmail() == null ? "" : token.getEmail()
        );
    }
}