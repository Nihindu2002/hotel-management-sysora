package com.hotel.hotel_management.settings;

/**
 * Property configuration the application reads from the backend.
 *
 * Exposed read-only: these values are deployment settings, not something the
 * UI should be able to change.
 */
public record SettingsResponse(
        double taxPercentage
) {
}
