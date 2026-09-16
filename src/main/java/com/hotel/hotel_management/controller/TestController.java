package com.hotel.hotel_management.controller;

import io.swagger.v3.oas.annotations.Hidden;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@Hidden
@RestController
public class TestController {

    @GetMapping("/api/test")
    public String test() {
        return "Hotel Management System API is working";
    }
}