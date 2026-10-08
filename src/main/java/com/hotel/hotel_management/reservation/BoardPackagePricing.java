package com.hotel.hotel_management.reservation;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
public class BoardPackagePricing {

    private final double roomOnlyPremium;
    private final double bedAndBreakfastPremium;
    private final double halfBoardPremium;
    private final double fullBoardPremium;

    public BoardPackagePricing(
            @Value("${hotel.board-packages.premiums.room-only:0}") double roomOnlyPremium,
            @Value("${hotel.board-packages.premiums.bed-and-breakfast:3000}") double bedAndBreakfastPremium,
            @Value("${hotel.board-packages.premiums.half-board:7000}") double halfBoardPremium,
            @Value("${hotel.board-packages.premiums.full-board:11000}") double fullBoardPremium) {

        this.roomOnlyPremium = validatePremium(roomOnlyPremium);
        this.bedAndBreakfastPremium = validatePremium(bedAndBreakfastPremium);
        this.halfBoardPremium = validatePremium(halfBoardPremium);
        this.fullBoardPremium = validatePremium(fullBoardPremium);
    }

    public static BoardPackagePricing defaults() {
        return new BoardPackagePricing(0, 3000, 7000, 11000);
    }

    public double getPremium(BoardPackage boardPackage) {
        return switch (boardPackage) {
            case ROOM_ONLY -> roomOnlyPremium;
            case BED_AND_BREAKFAST -> bedAndBreakfastPremium;
            case HALF_BOARD -> halfBoardPremium;
            case FULL_BOARD -> fullBoardPremium;
        };
    }

    public double getPricePerNight(double roomPricePerNight, BoardPackage boardPackage) {
        return round(roomPricePerNight + getPremium(boardPackage));
    }

    public List<BoardPackageOption> getOptions() {
        return Arrays.stream(BoardPackage.values())
                .map(boardPackage -> new BoardPackageOption(
                        boardPackage,
                        boardPackage.getLabel(),
                        boardPackage.getMealsIncluded(),
                        getPremium(boardPackage)))
                .toList();
    }

    private double validatePremium(double premium) {
        if (!Double.isFinite(premium) || premium < 0) {
            throw new IllegalArgumentException(
                    "Board package premiums must be finite, non-negative amounts");
        }
        return round(premium);
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
