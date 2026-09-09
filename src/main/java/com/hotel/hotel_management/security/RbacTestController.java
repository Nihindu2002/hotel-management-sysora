package com.hotel.hotel_management.security;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class RbacTestController {

    @GetMapping("/api/manager/test")
    public Map<String, String> managerTest(Authentication authentication) {
        return AuthenticatedUserResponse.from(authentication, "Manager endpoint accessible");
    }

    @GetMapping("/api/reservations/test")
    public Map<String, String> reservationsTest(Authentication authentication) {
        return AuthenticatedUserResponse.from(authentication, "Reservations endpoint accessible");
    }

    @GetMapping("/api/housekeeping/test")
    public Map<String, String> housekeepingTest(Authentication authentication) {
        return AuthenticatedUserResponse.from(authentication, "Housekeeping endpoint accessible");
    }

    @GetMapping("/api/finance/test")
    public Map<String, String> financeTest(Authentication authentication) {
        return AuthenticatedUserResponse.from(authentication, "Finance endpoint accessible");
    }

    @GetMapping("/api/accountant/test")
    public Map<String, String> accountantTest(Authentication authentication) {
        return AuthenticatedUserResponse.from(authentication, "Accountant endpoint accessible");
    }

    @GetMapping("/api/reception/test")
    public Map<String, String> receptionTest(Authentication authentication) {
        return AuthenticatedUserResponse.from(authentication, "Reception endpoint accessible");
    }

    @GetMapping("/api/receptionist/test")
    public Map<String, String> receptionistTest(Authentication authentication) {
        return AuthenticatedUserResponse.from(authentication, "Receptionist endpoint accessible");
    }

    @GetMapping("/api/staff/test")
    public Map<String, String> staffTest(Authentication authentication) {
        return AuthenticatedUserResponse.from(authentication, "Staff endpoint accessible");
    }
}