package com.hotel.hotel_management.reservation;

public record BoardPackageOption(
        BoardPackage code,
        String label,
        String mealsIncluded,
        double premiumPerNight
) {
}
