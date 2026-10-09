package com.hotel.hotel_management.invoice;

/**
 * How a discount is expressed. {@link #FIXED} is a currency amount off,
 * {@link #PERCENTAGE} is a percentage off the subtotal. {@link #NONE} means no
 * discount was applied.
 */
public enum DiscountType {
    NONE,
    FIXED,
    PERCENTAGE
}
