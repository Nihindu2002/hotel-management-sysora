package com.hotel.hotel_management.invoice;

import com.hotel.hotel_management.reservation.Reservation;
import com.hotel.hotel_management.room.Room;
import com.hotel.hotel_management.room.RoomRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/**
 * Prices a stay. This is the only place a bill total is calculated.
 *
 * The frontend shows a figure and the desk confirms it, but neither the room
 * price, the night count, nor the total is ever read back from the request:
 * nights come from the reservation's own dates and the rate comes from the room
 * record, so a tampered payload cannot change what the hotel is owed.
 *
 * Order of operations, matching the printed bill:
 * <pre>
 *   accommodation charge = nights × agreed package price per night
 *   subtotal      = room charge + additional charges
 *   discount      = fixed amount, or percentage of the subtotal (capped at it)
 *   tax           = (subtotal − discount) × configured tax rate
 *   total         = subtotal − discount + tax
 * </pre>
 */
@Service
public class BillingService {

    /** Descriptions are shown verbatim on the invoice, so keep them bounded. */
    private static final int MAX_DESCRIPTION_LENGTH = 120;

    private final RoomRepository roomRepository;

    /**
     * Tax applied at checkout. Zero by default: the hotel is not currently
     * registered for a room tax, and a non-zero default would silently inflate
     * every bill. Set {@code hotel.tax.percentage} to change it.
     */
    private final double taxPercentage;

    public BillingService(
            RoomRepository roomRepository,
            @Value("${hotel.tax.percentage:0}") double taxPercentage) {

        this.roomRepository = roomRepository;
        this.taxPercentage = taxPercentage;
    }

    public double getTaxPercentage() {
        return taxPercentage;
    }

    /**
     * Prices {@code reservation} with the given charge lines and discount.
     *
     * @throws IllegalArgumentException if the stay spans no nights, a charge or
     *         discount is negative, or the discount exceeds what it applies to.
     */
    public BillBreakdown calculate(
            Reservation reservation,
            List<AdditionalCharge> charges,
            DiscountType discountType,
            Double discountValue) {

        long nights = ChronoUnit.DAYS.between(
                reservation.getCheckInDate(),
                reservation.getCheckOutDate());

        if (nights <= 0) {
            throw new IllegalArgumentException(
                    "Check-out date must be after check-in date");
        }

        Room room = roomRepository.findById(reservation.getRoomId())
                .orElseThrow(() -> new IllegalArgumentException("Room not found"));

        double pricePerNight = reservation.getPackagePricePerNight() != null
                ? reservation.getPackagePricePerNight()
                : room.getPricePerNight() != null ? room.getPricePerNight() : 0.0;

        double roomCharge = round(nights * pricePerNight);
        List<AdditionalCharge> normalisedCharges = normaliseCharges(charges);
        double additionalTotal = round(normalisedCharges.stream()
                .mapToDouble(AdditionalCharge::amount)
                .sum());

        double subtotal = round(roomCharge + additionalTotal);

        DiscountType resolvedType = discountType != null ? discountType : DiscountType.NONE;
        double resolvedValue = discountValue != null ? discountValue : 0.0;

        if (resolvedValue < 0) {
            throw new IllegalArgumentException("Discount cannot be negative");
        }

        double discountAmount = resolveDiscount(resolvedType, resolvedValue, subtotal);
        double taxableAmount = round(subtotal - discountAmount);

        double taxRate = taxPercentage > 0 ? taxPercentage : 0.0;
        double taxAmount = round(taxableAmount * taxRate / 100.0);
        double total = round(taxableAmount + taxAmount);

        if (total < 0) {
            throw new IllegalArgumentException("Bill total cannot be negative");
        }

        return new BillBreakdown(
                nights,
                roomCharge,
                normalisedCharges,
                additionalTotal,
                subtotal,
                resolvedType,
                resolvedValue,
                discountAmount,
                taxRate,
                taxAmount,
                total);
    }

    /**
     * The accommodation charge, used when a booking is confirmed and the desk has
     * not yet added anything at checkout.
     */
    public BillBreakdown calculateRoomChargeOnly(Reservation reservation) {
        return calculate(reservation, List.of(), DiscountType.NONE, 0.0);
    }

    private double resolveDiscount(
            DiscountType type,
            double value,
            double subtotal) {

        double amount = switch (type) {
            case NONE -> 0.0;
            case FIXED -> value;
            case PERCENTAGE -> {
                if (value > 100) {
                    throw new IllegalArgumentException(
                            "Discount percentage cannot exceed 100%");
                }
                yield subtotal * value / 100.0;
            }
        };

        amount = round(amount);

        // A discount may zero a bill but never invert it, and it cannot reach
        // past the amount it is taken from.
        if (amount > subtotal) {
            throw new IllegalArgumentException(
                    "Discount cannot exceed the bill amount of " + format(subtotal));
        }

        return amount;
    }

    private List<AdditionalCharge> normaliseCharges(List<AdditionalCharge> charges) {

        List<AdditionalCharge> normalised = new ArrayList<>();

        if (charges == null) {
            return normalised;
        }

        for (AdditionalCharge charge : charges) {
            if (charge == null) {
                continue;
            }

            if (charge.amount() < 0) {
                throw new IllegalArgumentException(
                        "Additional charge amount cannot be negative");
            }

            String description = charge.description() != null
                    ? charge.description().trim() : "";

            if (description.isEmpty()) {
                throw new IllegalArgumentException(
                        "Additional charge requires a description");
            }

            if (description.length() > MAX_DESCRIPTION_LENGTH) {
                throw new IllegalArgumentException(
                        "Additional charge description cannot exceed "
                                + MAX_DESCRIPTION_LENGTH + " characters");
            }

            normalised.add(new AdditionalCharge(description, round(charge.amount())));
        }

        return normalised;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private String format(double value) {
        return String.format("%,.2f", value);
    }
}
