package com.hotel.hotel_management.exception;

public class ResourceNotFoundException extends IllegalArgumentException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}

