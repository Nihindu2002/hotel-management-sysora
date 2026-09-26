package com.hotel.hotel_management.invoice;

import com.hotel.hotel_management.reservation.Reservation;
import com.hotel.hotel_management.reservation.ReservationStatus;
import com.hotel.hotel_management.room.Room;
import com.hotel.hotel_management.room.RoomRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * The bill is the number the hotel collects, so these tests pin down the
 * arithmetic and the guards around it.
 */
class BillingServiceTest {

    private RoomRepository roomRepository;

    private static final double PRICE = 10000.0;

    @BeforeEach
    void setUp() {
        roomRepository = mock(RoomRepository.class);

        Room room = new Room();
        room.setRoomId("room-1");
        room.setRoomNumber("205");
        room.setPricePerNight(PRICE);

        when(roomRepository.findById("room-1")).thenReturn(Optional.of(room));
    }

    private BillingService billingService(double taxPercentage) {
        return new BillingService(roomRepository, taxPercentage);
    }

    private Reservation stay(long nights) {
        Reservation reservation = new Reservation();
        reservation.setReservationId("res-1");
        reservation.setRoomId("room-1");
        reservation.setStatus(ReservationStatus.CHECKED_IN);
        reservation.setCheckInDate(LocalDate.now());
        reservation.setCheckOutDate(LocalDate.now().plusDays(nights));
        return reservation;
    }

    @Test
    void roomChargeIsNightsTimesTheRoomRate() {
        BillBreakdown bill = billingService(0).calculate(stay(3), List.of(), null, null);

        assertEquals(3L, bill.nights());
        assertEquals(30000.0, bill.roomCharge());
        assertEquals(30000.0, bill.subtotal());
        assertEquals(0.0, bill.discountAmount());
        assertEquals(0.0, bill.taxAmount());
        assertEquals(30000.0, bill.totalAmount());
    }

    @Test
    void nightsComeFromTheReservationNotTheRequest() {
        // A three-night stay can only ever be billed as three nights.
        BillBreakdown bill = billingService(0).calculate(stay(3), List.of(), null, null);
        assertEquals(3L, bill.nights());
    }

    @Test
    void additionalChargesAreSummedOntoTheRoomCharge() {
        BillBreakdown bill = billingService(0).calculate(
                stay(3),
                List.of(AdditionalCharge.of("Extra Bed", 5000.0),
                        AdditionalCharge.of("Laundry", 2000.0),
                        AdditionalCharge.of("Room Service", 3000.0)),
                DiscountType.NONE,
                0.0);

        assertEquals(30000.0, bill.roomCharge());
        assertEquals(10000.0, bill.additionalChargesTotal());
        assertEquals(40000.0, bill.subtotal());
        assertEquals(40000.0, bill.totalAmount());
        assertEquals(3, bill.additionalCharges().size());
    }

    @Test
    void workedExampleFromTheSpec() {
        // 3 nights at 10,000 + 7,000 of extras, 10% off, no tax => 33,300.
        BillBreakdown bill = billingService(0).calculate(
                stay(3),
                List.of(AdditionalCharge.of("Extra Bed", 5000.0),
                        AdditionalCharge.of("Laundry", 2000.0)),
                DiscountType.PERCENTAGE,
                10.0);

        assertEquals(30000.0, bill.roomCharge());
        assertEquals(7000.0, bill.additionalChargesTotal());
        assertEquals(37000.0, bill.subtotal());
        assertEquals(3700.0, bill.discountAmount());
        assertEquals(0.0, bill.taxAmount());
        assertEquals(33300.0, bill.totalAmount());
    }

    @Test
    void percentageDiscountAppliesToTheSubtotal() {
        BillBreakdown bill = billingService(0).calculate(
                stay(2), List.of(AdditionalCharge.of("Minibar", 5000.0)),
                DiscountType.PERCENTAGE, 10.0);

        // (20,000 + 5,000) * 10% = 2,500
        assertEquals(2500.0, bill.discountAmount());
        assertEquals(22500.0, bill.totalAmount());
    }

    @Test
    void fixedDiscountIsTakenOffTheSubtotal() {
        BillBreakdown bill = billingService(0).calculate(
                stay(2), List.of(), DiscountType.FIXED, 5000.0);

        assertEquals(5000.0, bill.discountAmount());
        assertEquals(15000.0, bill.totalAmount());
    }

    @Test
    void taxIsAppliedAfterTheDiscount() {
        BillBreakdown bill = billingService(10).calculate(
                stay(2), List.of(), DiscountType.FIXED, 5000.0);

        // (20,000 - 5,000) * 10% = 1,500 — not 2,000, which discounting after
        // tax would have produced.
        assertEquals(10.0, bill.taxRate());
        assertEquals(1500.0, bill.taxAmount());
        assertEquals(16500.0, bill.totalAmount());
    }

    @Test
    void aFullDiscountZeroesTheBillWithoutGoingNegative() {
        BillBreakdown bill = billingService(10).calculate(
                stay(2), List.of(), DiscountType.PERCENTAGE, 100.0);

        assertEquals(20000.0, bill.discountAmount());
        assertEquals(0.0, bill.taxAmount());
        assertEquals(0.0, bill.totalAmount());
    }

    @Test
    void discountMayNotExceedTheBill() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> billingService(0).calculate(
                        stay(1), List.of(), DiscountType.FIXED, 20000.0));
        assertTrue(ex.getMessage().startsWith("Discount cannot exceed the bill amount"));
    }

    @Test
    void percentageDiscountMayNotExceedOneHundred() {
        assertThrows(IllegalArgumentException.class, () ->
                billingService(0).calculate(stay(1), List.of(), DiscountType.PERCENTAGE, 150.0));
    }

    @Test
    void negativeDiscountIsRejected() {
        assertThrows(IllegalArgumentException.class, () ->
                billingService(0).calculate(stay(1), List.of(), DiscountType.FIXED, -100.0));
    }

    @Test
    void negativeAdditionalChargeIsRejected() {
        assertThrows(IllegalArgumentException.class, () ->
                billingService(0).calculate(
                        stay(1), List.of(AdditionalCharge.of("Refund", -500.0)), null, null));
    }

    @Test
    void additionalChargeNeedsADescription() {
        assertThrows(IllegalArgumentException.class, () ->
                billingService(0).calculate(
                        stay(1), List.of(AdditionalCharge.of("  ", 500.0)), null, null));
    }

    @Test
    void aStayMustSpanAtLeastOneNight() {
        Reservation sameDay = stay(0);
        assertThrows(IllegalArgumentException.class, () ->
                billingService(0).calculate(sameDay, List.of(), null, null));
    }

    @Test
    void unknownRoomIsRejected() {
        Reservation orphan = stay(2);
        orphan.setRoomId("room-missing");

        assertThrows(IllegalArgumentException.class, () ->
                billingService(0).calculate(orphan, List.of(), null, null));
    }

    @Test
    void noTaxIsChargedWhenTheRateIsZero() {
        BillBreakdown bill = billingService(0).calculate(stay(1), List.of(), null, null);
        assertEquals(0.0, bill.taxRate());
        assertEquals(0.0, bill.taxAmount());
    }

    @Test
    void roomChargeOnlyIgnoresChargesAndDiscounts() {
        BillBreakdown bill = billingService(10).calculateRoomChargeOnly(stay(2));

        assertEquals(20000.0, bill.roomCharge());
        assertTrue(bill.additionalCharges().isEmpty());
        assertEquals(0.0, bill.discountAmount());
        assertEquals(2000.0, bill.taxAmount());
        assertEquals(22000.0, bill.totalAmount());
    }
}
