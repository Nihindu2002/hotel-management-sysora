package com.hotel.hotel_management.security;

import io.swagger.v3.oas.annotations.Hidden;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Hidden
@RestController
public class AdminTestController {

    @GetMapping("/api/admin/test")
    public Map<String, String> adminTest(Authentication authentication) {
        return AuthenticatedUserResponse.from(authentication, "Admin endpoint accessible");
    }
}