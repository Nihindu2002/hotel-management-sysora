package com.hotel.hotel_management.auth;

public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}