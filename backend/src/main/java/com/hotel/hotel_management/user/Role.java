package com.hotel.hotel_management.user;

import java.util.Locale;

/**
 * Roles a hotel employee can hold.
 *
 * There is no CUSTOMER role: this is a staff-operated application, occupants are
 * recorded on their reservation rather than given accounts.
 *
 * STAFF is a legacy catch-all that no seeded account uses; it is retained
 * because existing Firestore documents may still carry it and
 * {@code Role.valueOf} would throw on those users.
 */
public enum Role {
    ADMIN,
    MANAGER,
    RECEPTIONIST,
    HOUSEKEEPING,
    MAINTENANCE,
    ACCOUNTANT,
    STAFF;

    /**
     * Whether {@code role} names a role this application still recognises.
     *
     * Returning false is the right answer for the retired CUSTOMER role and for
     * anything unrecognised, which is what lets callers use this to refuse
     * non-staff accounts without special-casing them.
     */
    public static boolean isStaffRole(String role) {
        if (role == null) {
            return false;
        }
        try {
            Role.valueOf(role.toUpperCase(Locale.ROOT));
            return true;
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }
}
