package com.hotel.hotel_management.security;

public record AuthenticatedUser(String uid, String email) {
    public String getUid() { return uid; }
    public String getEmail() { return email; }
}
