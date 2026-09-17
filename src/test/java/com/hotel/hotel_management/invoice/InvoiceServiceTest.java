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
import static org.mockito.ArgumentMatchers.eq;
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
        invoiceService = new InvoiceService(invoiceRepository, reservationRepository, roomRepository, paymentService);
    }

    @Test
    void createInvoice_Success() {
        Reservation res = new Reservation();
        res.setReservationId("res-1");
        res.setCustomerUid("cust-1");
        res.setRoomId("room-1");
        res.setStatus(ReservationStatus.CONFIRMED);
        res.setCheckInDate(LocalDate.now().plusDays(1));
        res.setCheckOutDate(LocalDate.now().plusDays(4)); // 3 nights

        Room room = new Room();
        room.setRoomId("room-1");
        room.setPricePerNight(150.0);

        when(invoiceRepository.findByReservationId("res-1")).thenReturn(Optional.empty());
        when(reservationRepository.findById("res-1")).thenReturn(Optional.of(res));
        when(roomRepository.findById("room-1")).thenReturn(Optional.of(room));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Invoice invoice = invoiceService.createInvoice("res-1");

        assertNotNull(invoice);
        assertEquals("res-1", invoice.getReservationId());
        assertEquals("cust-1", invoice.getCustomerUid());
        assertEquals("room-1", invoice.getRoomId());
        assertEquals(450.0, invoice.getRoomCharge());
        assertEquals(450.0, invoice.getTotalAmount());
        assertEquals("UNPAID", invoice.getStatus());
        verify(invoiceRepository).save(any(Invoice.class));
    }

    @Test
    void createInvoice_FailsWhenInvoiceAlreadyExists() {
        when(invoiceRepository.findByReservationId("res-dup"))
                .thenReturn(Optional.of(new Invoice()));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> invoiceService.createInvoice("res-dup")
        );
        assertEquals("Invoice already exists for this reservation", ex.getMessage());
    }

    @Test
    void createInvoice_FailsWhenReservationNotFound() {
        when(invoiceRepository.findByReservationId("res-none")).thenReturn(Optional.empty());
        when(reservationRepository.findById("res-none")).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> invoiceService.createInvoice("res-none")
        );
        assertEquals("Reservation not found", ex.getMessage());
    }

    @Test
    void createInvoice_FailsWhenReservationIsPending() {
        Reservation res = new Reservation();
        res.setReservationId("res-pending");
        res.setStatus(ReservationStatus.PENDING);

        when(invoiceRepository.findByReservationId("res-pending")).thenReturn(Optional.empty());
        when(reservationRepository.findById("res-pending")).thenReturn(Optional.of(res));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> invoiceService.createInvoice("res-pending")
        );
        assertEquals("Cannot create invoice for a pending reservation. It must be confirmed by staff first.", ex.getMessage());
    }

    @Test
    void createInvoice_FailsWhenReservationIsCancelled() {
        Reservation res = new Reservation();
        res.setReservationId("res-cancelled");
        res.setStatus(ReservationStatus.CANCELLED);

        when(invoiceRepository.findByReservationId("res-cancelled")).thenReturn(Optional.empty());
        when(reservationRepository.findById("res-cancelled")).thenReturn(Optional.of(res));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> invoiceService.createInvoice("res-cancelled")
        );
        assertEquals("Cannot create invoice for a cancelled reservation.", ex.getMessage());
    }

    @Test
    void getInvoiceById_EnrichesWithPaidAndRemaining() {
        Invoice inv = new Invoice();
        inv.setInvoiceId("inv-100");
        inv.setTotalAmount(500.0);
        inv.setStatus("PARTIALLY_PAID");

        when(invoiceRepository.findById("inv-100")).thenReturn(Optional.of(inv));
        when(paymentService.getTotalPaidForInvoice("inv-100")).thenReturn(200.0);

        Invoice enriched = invoiceService.getInvoiceById("inv-100");

        assertNotNull(enriched);
        assertEquals(200.0, enriched.getPaidAmount());
        assertEquals(300.0, enriched.getRemainingAmount());
    }

    @Test
    void getMyInvoices_EnrichesEachInvoice() {
        Invoice inv1 = new Invoice();
        inv1.setInvoiceId("inv-1");
        inv1.setTotalAmount(1000.0);

        Invoice inv2 = new Invoice();
        inv2.setInvoiceId("inv-2");
        inv2.setTotalAmount(600.0);

        when(invoiceRepository.findByCustomerUid("cust-1")).thenReturn(List.of(inv1, inv2));

        Payment p1 = new Payment();
        p1.setInvoiceId("inv-1");
        p1.setAmount(1000.0);
        p1.setStatus("COMPLETED");

        Payment p2 = new Payment();
        p2.setInvoiceId("inv-2");
        p2.setAmount(100.0);
        p2.setStatus("COMPLETED");

        when(paymentService.getCustomerPayments("cust-1")).thenReturn(List.of(p1, p2));
        when(paymentService.getTotalPaidForInvoice("inv-1")).thenReturn(1000.0);
        when(paymentService.getTotalPaidForInvoice("inv-2")).thenReturn(100.0);

        List<Invoice> list = invoiceService.getMyInvoices("cust-1");

        assertEquals(2, list.size());
        assertEquals(1000.0, list.get(0).getPaidAmount());
        assertEquals(0.0, list.get(0).getRemainingAmount());
        assertEquals(100.0, list.get(1).getPaidAmount());
        assertEquals(500.0, list.get(1).getRemainingAmount());
    }

    @Test
    void updateInvoiceAmounts_FailsWhenTotalBelowPaid() {
        Invoice inv = new Invoice();
        inv.setInvoiceId("inv-upd");
        inv.setRoomCharge(1000.0);
        inv.setTotalAmount(1000.0);

        when(invoiceRepository.findById("inv-upd")).thenReturn(Optional.of(inv));
        when(paymentService.getTotalPaidForInvoice("inv-upd")).thenReturn(800.0);

        // discount 500 => new total = 1000 - 500 = 500 < 800 paid
        UpdateInvoiceRequest request = new UpdateInvoiceRequest(0.0, 500.0);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> invoiceService.updateInvoiceAmounts("inv-upd", request)
        );
        assertEquals("Invoice total cannot be less than the amount already paid", ex.getMessage());
    }

    @Test
    void deleteInvoice_FailsWhenPaymentsExist() {
        Invoice inv = new Invoice();
        inv.setInvoiceId("inv-del");
        inv.setTotalAmount(1000.0);

        when(invoiceRepository.findById("inv-del")).thenReturn(Optional.of(inv));
        when(paymentService.getTotalPaidForInvoice("inv-del")).thenReturn(200.0);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> invoiceService.deleteInvoice("inv-del")
        );
        assertEquals("Cannot delete an invoice that has payments", ex.getMessage());
    }

    @Test
    void deleteInvoice_SuccessWhenNoPayments() {
        Invoice inv = new Invoice();
        inv.setInvoiceId("inv-del-ok");
        inv.setTotalAmount(1000.0);

        when(invoiceRepository.findById("inv-del-ok")).thenReturn(Optional.of(inv));
        when(paymentService.getTotalPaidForInvoice("inv-del-ok")).thenReturn(0.0);

        assertDoesNotThrow(() -> invoiceService.deleteInvoice("inv-del-ok"));
        verify(invoiceRepository).delete("inv-del-ok");
    }
}

