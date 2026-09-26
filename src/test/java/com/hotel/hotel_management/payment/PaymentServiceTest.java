package com.hotel.hotel_management.payment;

import com.hotel.hotel_management.finance.FinanceService;
import com.hotel.hotel_management.invoice.Invoice;
import com.hotel.hotel_management.invoice.InvoiceRepository;
import com.hotel.hotel_management.invoice.InvoiceStatus;
import com.hotel.hotel_management.reservation.Reservation;
import com.hotel.hotel_management.reservation.ReservationRepository;
import com.hotel.hotel_management.reservation.ReservationStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class PaymentServiceTest {

    private static final String STAFF_UID = "staff-1";

    private PaymentRepository paymentRepository;
    private InvoiceRepository invoiceRepository;
    private FinanceService financeService;
    private ReservationRepository reservationRepository;
    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
        paymentRepository = mock(PaymentRepository.class);
        invoiceRepository = mock(InvoiceRepository.class);
        financeService = mock(FinanceService.class);
        reservationRepository = mock(ReservationRepository.class);

        paymentService = new PaymentService(
                paymentRepository,
                invoiceRepository,
                financeService,
                reservationRepository);
    }

    private Invoice invoice(String invoiceId, double total, String status) {
        Invoice invoice = new Invoice();
        invoice.setInvoiceId(invoiceId);
        invoice.setReservationId("res-1");
        invoice.setTotalAmount(total);
        invoice.setStatus(status);
        return invoice;
    }

    @Test
    void createPayment_RecordsPartialPaymentAndFinanceIncome() {
        Invoice invoice = invoice("inv-1", 10000.0, InvoiceStatus.UNPAID.name());

        when(invoiceRepository.findById("inv-1")).thenReturn(Optional.of(invoice));
        when(paymentRepository.getTotalPaidForInvoice("inv-1"))
                .thenReturn(0.0)      // balance check before the payment
                .thenReturn(4000.0);  // recomputed when the status is refreshed
        when(paymentRepository.save(any(Payment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Payment payment = paymentService.createPayment(
                new CreatePaymentRequest("inv-1", 4000.0, PaymentMethod.CARD), STAFF_UID);

        assertEquals("COMPLETED", payment.getStatus());
        assertEquals(4000.0, payment.getAmount());
        assertEquals("inv-1", payment.getInvoiceId());
        assertEquals("res-1", payment.getReservationId());
        assertEquals(STAFF_UID, payment.getRecordedBy());

        verify(invoiceRepository).updateStatus("inv-1", InvoiceStatus.PARTIALLY_PAID);
        verify(financeService).recordPaymentIncome(payment, STAFF_UID);
    }

    @Test
    void createPayment_SettlesTheInvoiceInFull() {
        Invoice invoice = invoice("inv-2", 10000.0, InvoiceStatus.PARTIALLY_PAID.name());

        when(invoiceRepository.findById("inv-2")).thenReturn(Optional.of(invoice));
        when(paymentRepository.getTotalPaidForInvoice("inv-2"))
                .thenReturn(4000.0)
                .thenReturn(10000.0);
        when(paymentRepository.save(any(Payment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Payment payment = paymentService.createPayment(
                new CreatePaymentRequest("inv-2", 6000.0, PaymentMethod.CASH), STAFF_UID);

        assertEquals(6000.0, payment.getAmount());
        verify(invoiceRepository).updateStatus("inv-2", InvoiceStatus.PAID);
        verify(financeService).recordPaymentIncome(payment, STAFF_UID);
    }

    @Test
    void createPayment_AcceptsEverySupportedMethod() {
        for (PaymentMethod method : PaymentMethod.values()) {
            reset(paymentRepository, invoiceRepository, financeService);

            Invoice invoice = invoice("inv-m", 1000.0, InvoiceStatus.UNPAID.name());
            when(invoiceRepository.findById("inv-m")).thenReturn(Optional.of(invoice));
            when(paymentRepository.getTotalPaidForInvoice("inv-m")).thenReturn(0.0);
            when(paymentRepository.save(any(Payment.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            Payment payment = paymentService.createPayment(
                    new CreatePaymentRequest("inv-m", 1000.0, method), STAFF_UID);

            assertEquals(method.name(), payment.getPaymentMethod());
        }
    }

    @Test
    void createPayment_FailsIfInvoiceAlreadyPaid() {
        when(invoiceRepository.findById("inv-paid"))
                .thenReturn(Optional.of(invoice("inv-paid", 5000.0, InvoiceStatus.PAID.name())));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                paymentService.createPayment(
                        new CreatePaymentRequest("inv-paid", 1000.0, PaymentMethod.CARD),
                        STAFF_UID));
        assertEquals("Invoice is already fully paid", ex.getMessage());
    }

    @Test
    void createPayment_FailsIfAmountExceedsTheOutstandingBalance() {
        when(invoiceRepository.findById("inv-bal"))
                .thenReturn(Optional.of(invoice("inv-bal", 5000.0, InvoiceStatus.PARTIALLY_PAID.name())));
        when(paymentRepository.getTotalPaidForInvoice("inv-bal")).thenReturn(4000.0);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                paymentService.createPayment(
                        new CreatePaymentRequest("inv-bal", 2000.0, PaymentMethod.CARD),
                        STAFF_UID));
        assertTrue(ex.getMessage().startsWith("Payment amount exceeds remaining invoice balance"));
    }

    @Test
    void createPayment_RejectsNonPositiveAmounts() {
        assertThrows(IllegalArgumentException.class, () ->
                paymentService.createPayment(
                        new CreatePaymentRequest("inv-x", 0.0, PaymentMethod.CARD),
                        STAFF_UID));
        assertThrows(IllegalArgumentException.class, () ->
                paymentService.createPayment(
                        new CreatePaymentRequest("inv-x", -100.0, PaymentMethod.CARD),
                        STAFF_UID));

        verify(paymentRepository, never()).save(any(Payment.class));
    }

    @Test
    void createPayment_FailsWhenInvoiceNotFound() {
        when(invoiceRepository.findById("inv-missing")).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                paymentService.createPayment(
                        new CreatePaymentRequest("inv-missing", 100.0, PaymentMethod.CARD),
                        STAFF_UID));
        assertEquals("Invoice not found", ex.getMessage());
    }

    @Test
    void createPayment_FailsForACancelledReservation() {
        Invoice invoice = invoice("inv-cancelled", 5000.0, InvoiceStatus.UNPAID.name());

        Reservation cancelled = new Reservation();
        cancelled.setReservationId("res-1");
        cancelled.setStatus(ReservationStatus.CANCELLED);

        when(invoiceRepository.findById("inv-cancelled")).thenReturn(Optional.of(invoice));
        when(reservationRepository.findById("res-1")).thenReturn(Optional.of(cancelled));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                paymentService.createPayment(
                        new CreatePaymentRequest("inv-cancelled", 1000.0, PaymentMethod.CARD),
                        STAFF_UID));
        assertEquals("Cannot record a payment for a cancelled reservation.", ex.getMessage());

        verify(paymentRepository, never()).save(any(Payment.class));
    }

    @Test
    void createPayment_IsAllowedBeforeTheGuestHasCheckedIn() {
        // A confirmed booking can be settled up front; only a cancelled stay is
        // refused.
        Invoice invoice = invoice("inv-conf", 500.0, InvoiceStatus.UNPAID.name());

        Reservation confirmed = new Reservation();
        confirmed.setReservationId("res-1");
        confirmed.setStatus(ReservationStatus.CONFIRMED);

        when(invoiceRepository.findById("inv-conf")).thenReturn(Optional.of(invoice));
        when(reservationRepository.findById("res-1")).thenReturn(Optional.of(confirmed));
        when(paymentRepository.getTotalPaidForInvoice("inv-conf"))
                .thenReturn(0.0)
                .thenReturn(500.0);
        when(paymentRepository.save(any(Payment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Payment payment = paymentService.createPayment(
                new CreatePaymentRequest("inv-conf", 500.0, PaymentMethod.ONLINE), STAFF_UID);

        assertEquals(500.0, payment.getAmount());
        verify(invoiceRepository).updateStatus("inv-conf", InvoiceStatus.PAID);
        verify(financeService).recordPaymentIncome(payment, STAFF_UID);
    }

    @Test
    void refundPayment_RecalculatesTheInvoiceFromRemainingPayments() {
        Payment payment = new Payment();
        payment.setPaymentId("pay-1");
        payment.setInvoiceId("inv-refund");
        payment.setAmount(4000.0);
        payment.setStatus("COMPLETED");

        Payment refunded = new Payment();
        refunded.setPaymentId("pay-1");
        refunded.setInvoiceId("inv-refund");
        refunded.setAmount(4000.0);
        refunded.setRecordedBy(STAFF_UID);
        refunded.setStatus("REFUNDED");

        when(paymentRepository.findById("pay-1")).thenReturn(Optional.of(payment));
        when(paymentRepository.updateStatus("pay-1", PaymentStatus.REFUNDED)).thenReturn(refunded);
        when(invoiceRepository.findById("inv-refund"))
                .thenReturn(Optional.of(invoice("inv-refund", 10000.0, InvoiceStatus.PAID.name())));
        when(paymentRepository.getTotalPaidForInvoice("inv-refund")).thenReturn(6000.0);

        Payment result = paymentService.refundPayment("pay-1", "manager-uid");

        assertEquals("REFUNDED", result.getStatus());
        verify(invoiceRepository).updateStatus("inv-refund", InvoiceStatus.PARTIALLY_PAID);
        verify(financeService).recordPaymentRefund(refunded, "manager-uid");
    }

    @Test
    void refundPayment_ReturnsInvoiceToUnpaidWhenNothingIsLeft() {
        Payment payment = new Payment();
        payment.setPaymentId("pay-2");
        payment.setInvoiceId("inv-refund-2");
        payment.setAmount(10000.0);
        payment.setStatus("COMPLETED");

        Payment refunded = new Payment();
        refunded.setPaymentId("pay-2");
        refunded.setInvoiceId("inv-refund-2");
        refunded.setAmount(10000.0);
        refunded.setStatus("REFUNDED");

        when(paymentRepository.findById("pay-2")).thenReturn(Optional.of(payment));
        when(paymentRepository.updateStatus("pay-2", PaymentStatus.REFUNDED)).thenReturn(refunded);
        when(invoiceRepository.findById("inv-refund-2"))
                .thenReturn(Optional.of(invoice("inv-refund-2", 10000.0, InvoiceStatus.PAID.name())));
        when(paymentRepository.getTotalPaidForInvoice("inv-refund-2")).thenReturn(0.0);

        paymentService.refundPayment("pay-2", "admin-uid");

        verify(invoiceRepository).updateStatus("inv-refund-2", InvoiceStatus.UNPAID);
        verify(financeService).recordPaymentRefund(refunded, "admin-uid");
    }

    @Test
    void refundPayment_FailsIfAlreadyRefunded() {
        Payment payment = new Payment();
        payment.setPaymentId("pay-already");
        payment.setStatus("REFUNDED");

        when(paymentRepository.findById("pay-already")).thenReturn(Optional.of(payment));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> paymentService.refundPayment("pay-already", "admin-uid"));
        assertEquals("Payment is already refunded", ex.getMessage());
    }

    @Test
    void refundPayment_FailsIfNotCompleted() {
        Payment payment = new Payment();
        payment.setPaymentId("pay-not-completed");
        payment.setStatus("PENDING");

        when(paymentRepository.findById("pay-not-completed")).thenReturn(Optional.of(payment));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> paymentService.refundPayment("pay-not-completed", "admin-uid"));
        assertEquals("Only completed payments can be refunded", ex.getMessage());
    }
}
