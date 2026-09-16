package com.hotel.hotel_management.exception;

public class ConflictException extends IllegalArgumentException {

    public ConflictException(String message) {
        super(message);
    }
}

