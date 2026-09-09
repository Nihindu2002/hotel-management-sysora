package com.hotel.hotel_management.auth;

public class FirebaseOperationException extends RuntimeException {

    public FirebaseOperationException(String message, Throwable cause) {
        super(message, cause);
    }
}