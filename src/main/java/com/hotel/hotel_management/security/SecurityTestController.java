package com.hotel.hotel_management.security;

import com.hotel.hotel_management.user.User;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SecurityTestController {

    @GetMapping("/api/customer/test")
    public String customerTest(Authentication authentication) {

        User user = (User) authentication.getDetails();

        return "Customer access successful. Email: "
                + user.getEmail()
                + ", Role: "
                + user.getRole();
    }
}