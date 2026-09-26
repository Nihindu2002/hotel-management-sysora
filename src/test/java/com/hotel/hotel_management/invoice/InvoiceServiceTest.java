package com.hotel.hotel_management.invoice;

import com.hotel.hotel_management.payment.Payment;
import com.hotel.hotel_management.payment.PaymentService;
import com.hotel.hotel_management.reservation.Reservation;
import com.hotel.hotel_management.reservation.ReservationRepository;
import com.hotel.hotel_management.reservation.ReservationStatus;
import com.hotel.hotel_management.room.Room;
import com.hotel.hotel_management.room.RoomRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class InvoiceServiceTest {

    private InvoiceRepository invoiceRepository;
    private ReservationRepository reservationRepository;
    private RoomRepository roomRepository;
    private PaymentService paymentService;
    private InvoiceService invoiceService;

    @BeforeEach
    void setUp() {
        invoiceRepository = mock(InvoiceRepository.class);
        reservationRepository = mock(ReservationRepository.class);
        roomRepository = mock(RoomRepository.class);
        paymentService = mock(PaymentService.class);

        // The real calculator, not a mock: the point of these tests is that the
        // stored bill matches what BillingService works out.
        BillingService billingService = new BillingService(roomRepository, 0.0);

        invoiceService = new InvoiceService(
                invoiceRepository, reservationRepository, roomRepository,
                paymentService, billingService);
    }

    // ── Helpers ──

    private Reservation reservation(String resId, String roomId, ReservationStatus status) {
        Reservation reservation = new Reservation();
        reservation.setReservationId(resId);
        reservation.setRoomId(roomId);
        reservation.setCustomerName("Nimal Perera");
        reservation.setStatus(status);
        return reservation;
    }

    private Room room(String roomId, double pricePerNight) {
        Room room = new Room();
        room.setRoomId(roomId);
        room.setRoomNumber("205");
        room.setPricePerNight(pricePerNight);
        return room;
    }

    private void stubSave() {
        when(invoiceRepository.save(any(Invoice.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    // ── Creation ──

    @Test
    void createInvoice_ChargesNightsTimesRoomRate() {
        Reservation res = reservation("res-1", "room-1", ReservationStatus.CONFIRMED);
        res.setCheckInDate(LocalDate.now().plusDays(1));
        res.setCheckOutDate(LocalDate.now().plusDays(4)); // 3 nights

        when(invoiceRepository.findByReservationId("res-1")).thenReturn(Optional.empty());
        when(reservationRepository.findById("res-1")).thenReturn(Optional.of(res));
        when(roomRepository.findById("room-1")).thenReturn(Optional.of(room("room-1", 150.0)));
        stubSave();

        Invoice invoice = invoiceService.createInvoice("res-1");

        assertNotNull(invoice);
        assertEquals("res-1", invoice.getReservationId());
        assertEquals("room-1", invoice.getRoomId());
        assertEquals("205", invoice.getRoomNumber());
        assertEquals("Nimal Perera", invoice.getCustomerName());
        assertEquals(3L, invoice.getNights());
        assertEquals(450.0, invoice.getRoomCharge());
        assertEquals(0.0, invoice.getAdditionalChargesTotal());
        assertEquals(450.0, invoice.getSubtotal());
        assertEquals(0.0, invoice.getDiscountAmount());
        assertEquals(DiscountType.NONE, invoice.getDiscountType());
        assertEquals(0.0, invoice.getTaxAmount());
        assertEquals(450.0, invoice.getTotalAmount());
        assertEquals("UNPAID", invoice.getStatus());
        verify(invoiceRepository).save(any(Invoice.class));
    }

    @Test
    void createInvoice_FailsWhenInvoiceAlreadyExists() {
        when(invoiceRepository.findByReservationId("res-dup"))
                .thenReturn(Optional.of(new Invoice()));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> invoiceService.createInvoice("res-dup"));
        assertEquals("Invoice already exists for this reservation", ex.getMessage());
    }

    @Test
    void createInvoice_FailsWhenReservationNotFound() {
        when(invoiceRepository.findByReservationId("res-none")).thenReturn(Optional.empty());
        when(reservationRepository.findById("res-none")).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> invoiceService.createInvoice("res-none"));
        assertEquals("Reservation not found", ex.getMessage());
    }

    @Test
    void createInvoice_FailsWhenReservationIsPending() {
        Reservation res = reservation("res-pending", "room-1", ReservationStatus.PENDING);

        when(invoiceRepository.findByReservationId("res-pending")).thenReturn(Optional.empty());
        when(reservationRepository.findById("res-pending")).thenReturn(Optional.of(res));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> invoiceService.createInvoice("res-pending"));
        assertEquals(
                "Cannot create an invoice for a pending reservation. It must be confirmed by staff first.",
                ex.getMessage());
    }

    @Test
    void createInvoice_FailsWhenReservationIsCancelled() {
        Reservation res = reservation("res-cancelled", "room-1", ReservationStatus.CANCELLED);

        when(invoiceRepository.findByReservationId("res-cancelled")).thenReturn(Optional.empty());
        when(reservationRepository.findById("res-cancelled")).thenReturn(Optional.of(res));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> invoiceService.createInvoice("res-cancelled"));
        assertEquals("Cannot create an invoice for a cancelled reservation.", ex.getMessage());
    }

    @Test
    void ensureInvoice_ReturnsTheExistingInvoiceRatherThanCreatingASecond() {
        Reservation res = reservation("res-2", "room-1", ReservationStatus.CONFIRMED);
        Invoice existing = new Invoice();
        existing.setInvoiceId("inv-existing");

        when(invoiceRepository.findByReservationId("res-2")).thenReturn(Optional.of(existing));

        assertSame(existing, invoiceService.ensureInvoice(res));
        verify(invoiceRepository, never()).save(any(Invoice.class));
    }

    // ── Repricing ──

    @Test
    void applyBill_AddsChargesAndAppliesPercentageDiscount() {
        Reservation res = reservation("res-3", "room-1", ReservationStatus.CHECKED_IN);
        res.setCheckInDate(LocalDate.now().minusDays(3));
        res.setCheckOutDate(LocalDate.now());                       // 3 nights

        Invoice existing = new Invoice();
        existing.setInvoiceId("inv-3");

        when(invoiceRepository.findByReservationId("res-3")).thenReturn(Optional.of(existing));
        when(roomRepository.findById("room-1")).thenReturn(Optional.of(room("room-1", 10000.0)));
        when(paymentService.getTotalPaidForInvoice("inv-3")).thenReturn(0.0);
        stubSave();

        Invoice priced = invoiceService.applyBill(
                res,
                List.of(AdditionalCharge.of("Extra Bed", 5000.0),
                        AdditionalCharge.of("Laundry", 2000.0)),
                DiscountType.PERCENTAGE,
                10.0);

        assertEquals(30000.0, priced.getRoomCharge());
        assertEquals(7000.0, priced.getAdditionalChargesTotal());
        assertEquals(37000.0, priced.getSubtotal());
        assertEquals(3700.0, priced.getDiscountAmount());
        assertEquals(33300.0, priced.getTotalAmount());
        // Rewrites the existing invoice instead of creating a second one.
        assertEquals("inv-3", priced.getInvoiceId());
        verify(invoiceRepository, times(1)).save(any(Invoice.class));
    }

    @Test
    void applyBill_SupportsAFixedDiscount() {
        Reservation res = reservation("res-4", "room-1", ReservationStatus.CHECKED_IN);
        res.setCheckInDate(LocalDate.now().minusDays(1));
        res.setCheckOutDate(LocalDate.now());                       // 1 night

        Invoice existing = new Invoice();
        existing.setInvoiceId("inv-4");

        when(invoiceRepository.findByReservationId("res-4")).thenReturn(Optional.of(existing));
        when(roomRepository.findById("room-1")).thenReturn(Optional.of(room("room-1", 20000.0)));
        when(paymentService.getTotalPaidForInvoice("inv-4")).thenReturn(0.0);
        stubSave();

        Invoice priced = invoiceService.applyBill(
                res, List.of(), DiscountType.FIXED, 5000.0);

        assertEquals(20000.0, priced.getSubtotal());
        assertEquals(5000.0, priced.getDiscountAmount());
        assertEquals(15000.0, priced.getTotalAmount());
    }

    @Test
    void applyBill_RejectsDiscountLargerThanTheBill() {
        Reservation res = reservation("res-5", "room-1", ReservationStatus.CHECKED_IN);
        res.setCheckInDate(LocalDate.now().minusDays(1));
        res.setCheckOutDate(LocalDate.now());

        Invoice existing = new Invoice();
        existing.setInvoiceId("inv-5");

        when(invoiceRepository.findByReservationId("res-5")).thenReturn(Optional.of(existing));
        when(roomRepository.findById("room-1")).thenReturn(Optional.of(room("room-1", 1000.0)));

        assertThrows(IllegalArgumentException.class, () -> invoiceService.applyBill(
                res, List.of(), DiscountType.FIXED, 5000.0));
    }

    @Test
    void applyBill_RefusesToDropTheBillBelowWhatWasAlreadyPaid() {
        Reservation res = reservation("res-6", "room-1", ReservationStatus.CHECKED_IN);
        res.setCheckInDate(LocalDate.now().minusDays(1));
        res.setCheckOutDate(LocalDate.now());

        Invoice existing = new Invoice();
        existing.setInvoiceId("inv-6");

        when(invoiceRepository.findByReservationId("res-6")).thenReturn(Optional.of(existing));
        when(roomRepository.findById("room-1")).thenReturn(Optional.of(room("room-1", 10000.0)));
        when(paymentService.getTotalPaidForInvoice("inv-6")).thenReturn(8000.0);

        // 10000 - 5000 discount = 5000, which is less than the 8000 already taken.
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> invoiceService.applyBill(res, List.of(), DiscountType.FIXED, 5000.0));
        assertEquals("Bill total cannot be less than the amount already paid", ex.getMessage());
    }

    // ── Reads ──

    @Test
    void getInvoiceById_EnrichesWithPaidAndRemaining() {
        Invoice inv = new Invoice();
        inv.setInvoiceId("inv-100");
        inv.setTotalAmount(500.0);
        inv.setStatus("PARTIALLY_PAID");

        when(invoiceRepository.findById("inv-100")).thenReturn(Optional.of(inv));
        when(paymentService.getTotalPaidForInvoice("inv-100")).thenReturn(200.0);

        Invoice enriched = invoiceService.getInvoiceById("inv-100");

        assertEquals(200.0, enriched.getPaidAmount());
        assertEquals(300.0, enriched.getRemainingAmount());
    }

    @Test
    void getAllInvoices_EnrichesEveryInvoiceFromOneLedgerRead() {
        Invoice inv1 = new Invoice();
        inv1.setInvoiceId("inv-1");
        inv1.setTotalAmount(1000.0);

        Invoice inv2 = new Invoice();
        inv2.setInvoiceId("inv-2");
        inv2.setTotalAmount(600.0);

        Payment p1 = new Payment();
        p1.setInvoiceId("inv-1");
        p1.setAmount(1000.0);
        p1.setStatus("COMPLETED");

        Payment p2 = new Payment();
        p2.setInvoiceId("inv-2");
        p2.setAmount(100.0);
        p2.setStatus("COMPLETED");

        when(invoiceRepository.findAll()).thenReturn(List.of(inv1, inv2));
        when(paymentService.getAllPayments()).thenReturn(List.of(p1, p2));

        List<Invoice> list = invoiceService.getAllInvoices();

        assertEquals(2, list.size());
        assertEquals(1000.0, list.get(0).getPaidAmount());
        assertEquals(0.0, list.get(0).getRemainingAmount());
        assertEquals(100.0, list.get(1).getPaidAmount());
        assertEquals(500.0, list.get(1).getRemainingAmount());
    }

    @Test
    void getInvoiceByReservationId_ReturnsNullWhenNobodyHasBilledTheStay() {
        when(invoiceRepository.findByReservationId("res-none")).thenReturn(Optional.empty());
        assertNull(invoiceService.getInvoiceByReservationId("res-none"));
    }

    @Test
    void recalculateInvoiceStatus_DerivesStatusFromPayments() {
        Invoice inv = new Invoice();
        inv.setInvoiceId("inv-rec");
        inv.setTotalAmount(1000.0);

        when(invoiceRepository.findById("inv-rec")).thenReturn(Optional.of(inv));
        when(paymentService.getTotalPaidForInvoice("inv-rec")).thenReturn(0.0);
        when(invoiceRepository.updateStatus("inv-rec", InvoiceStatus.UNPAID))
                .thenReturn(inv);
        invoiceService.recalculateInvoiceStatus("inv-rec");
        verify(invoiceRepository).updateStatus("inv-rec", InvoiceStatus.UNPAID);

        when(paymentService.getTotalPaidForInvoice("inv-rec")).thenReturn(400.0);
        when(invoiceRepository.updateStatus("inv-rec", InvoiceStatus.PARTIALLY_PAID))
                .thenReturn(inv);
        invoiceService.recalculateInvoiceStatus("inv-rec");
        verify(invoiceRepository).updateStatus("inv-rec", InvoiceStatus.PARTIALLY_PAID);

        when(paymentService.getTotalPaidForInvoice("inv-rec")).thenReturn(1000.0);
        when(invoiceRepository.updateStatus("inv-rec", InvoiceStatus.PAID))
                .thenReturn(inv);
        invoiceService.recalculateInvoiceStatus("inv-rec");
        verify(invoiceRepository).updateStatus("inv-rec", InvoiceStatus.PAID);
    }

    // ── Deletion ──

    @Test
    void deleteInvoice_FailsWhenPaymentsExist() {
        Invoice inv = new Invoice();
        inv.setInvoiceId("inv-del");
        inv.setTotalAmount(1000.0);

        when(invoiceRepository.findById("inv-del")).thenReturn(Optional.of(inv));
        when(paymentService.getTotalPaidForInvoice("inv-del")).thenReturn(200.0);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> invoiceService.deleteInvoice("inv-del"));
        assertEquals("Cannot delete an invoice that has payments", ex.getMessage());
    }

    @Test
    void deleteInvoice_SucceedsWhenNothingWasPaid() {
        Invoice inv = new Invoice();
        inv.setInvoiceId("inv-del-ok");
        inv.setTotalAmount(1000.0);

        when(invoiceRepository.findById("inv-del-ok")).thenReturn(Optional.of(inv));
        when(paymentService.getTotalPaidForInvoice("inv-del-ok")).thenReturn(0.0);

        assertDoesNotThrow(() -> invoiceService.deleteInvoice("inv-del-ok"));
        verify(invoiceRepository).delete("inv-del-ok");
    }
}
