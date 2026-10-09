package com.hotel.hotel_management.reservation;

public enum BoardPackage {
    ROOM_ONLY("Room Only", "Accommodation only"),
    BED_AND_BREAKFAST("Bed & Breakfast", "Breakfast included"),
    HALF_BOARD("Half Board", "Breakfast and dinner included"),
    FULL_BOARD("Full Board", "Breakfast, lunch and dinner included");

    private final String label;
    private final String mealsIncluded;

    BoardPackage(String label, String mealsIncluded) {
        this.label = label;
        this.mealsIncluded = mealsIncluded;
    }

    public String getLabel() {
        return label;
    }

    public String getMealsIncluded() {
        return mealsIncluded;
    }
}
