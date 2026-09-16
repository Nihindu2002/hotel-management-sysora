package com.hotel.hotel_management.payment;

import com.hotel.hotel_management.common.ForbiddenException;
import com.hotel.hotel_management.finance.FinanceService;
import com.hotel.hotel_management.invoice.Invoice;
import com.hotel.hotel_management.invoice.InvoiceRepository;
import com.hotel.hotel_management.invoice.InvoiceStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class PaymentServiceTest {

    private PaymentRepository paymentRepository;
    private InvoiceRepository invoiceRepository;
    private FinanceService financeService;
    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
        paymentRepository = mock(PaymentRepository.class);
        invoiceRepository = mock(InvoiceRepository.class);
        financeService = mock(FinanceService.class);
        paymentService = new PaymentService(paymentRepository, invoiceRepository, financeService);
    }

    @Test
    void createPayment_Success_PartialPayment() {
        Invoice invoice = new Invoice();
        invoice.setInvoiceId("inv-1");
        invoice.setCustomerUid("cust-1");
        invoice.setReservationId("res-1");
        invoice.setTotalAmount(10000.0);
        invoice.setStatus(InvoiceStatus.UNPAID.name());

        when(invoiceRepository.findById("inv-1")).thenReturn(Optional.of(invoice));
        when(paymentRepository.getTotalPaidForInvoice("inv-1"))
                .thenReturn(0.0)      // initial check
                .thenReturn(4000.0);   // after payment saved in updateInvoiceStatus
        when(paymentRepository.save(any(Payment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CreatePaymentRequest request = new CreatePaymentRequest("inv-1", 4000.0, PaymentMethod.CARD);

        Payment payment = paymentService.createPayment(request, "cust-1", "staff-1");

        assertNotNull(payment);
        assertEquals("COMPLETED", payment.getStatus());
        assertEquals(4000.0, payment.getAmount());
        assertEquals("inv-1", payment.getInvoiceId());
        assertEquals("cust-1", payment.getCustomerUid());

        verify(invoiceRepository).updateStatus("inv-1", InvoiceStatus.PARTIALLY_PAID);
        verify(financeService).recordPaymentIncome(payment, "staff-1");
    }

    @Test
    void createPayment_Success_FullPayment() {
        Invoice invoice = new Invoice();
        invoice.setInvoiceId("inv-2");
        invoice.setCustomerUid("cust-2");
        invoice.setReservationId("res-2");
        invoice.setTotalAmount(10000.0);
        invoice.setStatus(InvoiceStatus.PARTIALLY_PAID.name());

        when(invoiceRepository.findById("inv-2")).thenReturn(Optional.of(invoice));
        when(paymentRepository.getTotalPaidForInvoice("inv-2"))
                .thenReturn(4000.0)     // initial check (10000 - 4000 = 6000 remaining)
                .thenReturn(10000.0);   // after payment saved in updateInvoiceStatus
        when(paymentRepository.save(any(Payment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CreatePaymentRequest request = new CreatePaymentRequest("inv-2", 6000.0, PaymentMethod.CASH);

        Payment payment = paymentService.createPayment(request, "cust-2", "staff-2");

        assertNotNull(payment);
        assertEquals("COMPLETED", payment.getStatus());
        assertEquals(6000.0, payment.getAmount());

        verify(invoiceRepository).updateStatus("inv-2", InvoiceStatus.PAID);
        verify(financeService).recordPaymentIncome(payment, "staff-2");
    }

    @Test
    void createPayment_FailsIfInvoiceAlreadyPaid() {
        Invoice invoice = new Invoice();
        invoice.setInvoiceId("inv-paid");
        invoice.setCustomerUid("cust-1");
        invoice.setTotalAmount(5000.0);
        invoice.setStatus(InvoiceStatus.PAID.name());

        when(invoiceRepository.findById("inv-paid")).thenReturn(Optional.of(invoice));

        CreatePaymentRequest request = new CreatePaymentRequest("inv-paid", 1000.0, PaymentMethod.CARD);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> paymentService.createPayment(request, "cust-1", "cust-1")
        );
        assertEquals("Invoice is already fully paid", ex.getMessage());
    }

    @Test
    void createPayment_FailsIfExceedsBalance() {
        Invoice invoice = new Invoice();
        invoice.setInvoiceId("inv-bal");
        invoice.setCustomerUid("cust-1");
        invoice.setTotalAmount(5000.0);
        invoice.setStatus(InvoiceStatus.PARTIALLY_PAID.name());

        when(invoiceRepository.findById("inv-bal")).thenReturn(Optional.of(invoice));
        when(paymentRepository.getTotalPaidForInvoice("inv-bal")).thenReturn(4000.0);

        CreatePaymentRequest request = new CreatePaymentRequest("inv-bal", 2000.0, PaymentMethod.CARD);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> paymentService.createPayment(request, "cust-1", "cust-1")
        );
        assertEquals("Payment amount exceeds remaining invoice balance", ex.getMessage());
    }

    @Test
    void createPayment_FailsIfCustomerUnauthorized() {
        Invoice invoice = new Invoice();
        invoice.setInvoiceId("inv-cust");
        invoice.setCustomerUid("cust-owner");
        invoice.setTotalAmount(5000.0);
        invoice.setStatus(InvoiceStatus.UNPAID.name());

        when(invoiceRepository.findById("inv-cust")).thenReturn(Optional.of(invoice));

        CreatePaymentRequest request = new CreatePaymentRequest("inv-cust", 1000.0, PaymentMethod.CARD);

        ForbiddenException ex = assertThrows(
                ForbiddenException.class,
                () -> paymentService.createPayment(request, "other-customer", "other-customer")
        );
        assertEquals("You are not authorized to pay this invoice", ex.getMessage());
    }

    @Test
    void refundPayment_Success_RecalculatesToPartiallyPaid() {
        Payment payment = new Payment();
        payment.setPaymentId("pay-1");
        payment.setInvoiceId("inv-refund");
        payment.setCustomerUid("cust-1");
        payment.setAmount(4000.0);
        payment.setStatus("COMPLETED");

        Invoice invoice = new Invoice();
        invoice.setInvoiceId("inv-refund");
        invoice.setTotalAmount(10000.0);
        invoice.setStatus(InvoiceStatus.PAID.name());

        Payment refundedPayment = new Payment();
        refundedPayment.setPaymentId("pay-1");
        refundedPayment.setInvoiceId("inv-refund");
        refundedPayment.setCustomerUid("cust-1");
        refundedPayment.setAmount(4000.0);
        refundedPayment.setStatus("REFUNDED");

        when(paymentRepository.findById("pay-1")).thenReturn(Optional.of(payment));
        when(paymentRepository.updateStatus("pay-1", PaymentStatus.REFUNDED)).thenReturn(refundedPayment);
        when(invoiceRepository.findById("inv-refund")).thenReturn(Optional.of(invoice));
        // Remaining paid after refunding this 4000 is 6000 out of 10000
        when(paymentRepository.getTotalPaidForInvoice("inv-refund")).thenReturn(6000.0);

        Payment result = paymentService.refundPayment("pay-1", "manager-uid");

        assertNotNull(result);
        assertEquals("REFUNDED", result.getStatus());
        verify(invoiceRepository).updateStatus("inv-refund", InvoiceStatus.PARTIALLY_PAID);
        verify(financeService).recordPaymentRefund(refundedPayment, "manager-uid");
    }

    @Test
    void refundPayment_Success_RecalculatesToUnpaid() {
        Payment payment = new Payment();
        payment.setPaymentId("pay-2");
        payment.setInvoiceId("inv-refund-2");
        payment.setCustomerUid("cust-2");
        payment.setAmount(10000.0);
        payment.setStatus("COMPLETED");

        Invoice invoice = new Invoice();
        invoice.setInvoiceId("inv-refund-2");
        invoice.setTotalAmount(10000.0);
        invoice.setStatus(InvoiceStatus.PAID.name());

        Payment refundedPayment = new Payment();
        refundedPayment.setPaymentId("pay-2");
        refundedPayment.setInvoiceId("inv-refund-2");
        refundedPayment.setCustomerUid("cust-2");
        refundedPayment.setAmount(10000.0);
        refundedPayment.setStatus("REFUNDED");

        when(paymentRepository.findById("pay-2")).thenReturn(Optional.of(payment));
        when(paymentRepository.updateStatus("pay-2", PaymentStatus.REFUNDED)).thenReturn(refundedPayment);
        when(invoiceRepository.findById("inv-refund-2")).thenReturn(Optional.of(invoice));
        // Remaining paid after refund is 0.0
        when(paymentRepository.getTotalPaidForInvoice("inv-refund-2")).thenReturn(0.0);

        Payment result = paymentService.refundPayment("pay-2", "admin-uid");

        assertNotNull(result);
        assertEquals("REFUNDED", result.getStatus());
        verify(invoiceRepository).updateStatus("inv-refund-2", InvoiceStatus.UNPAID);
        verify(financeService).recordPaymentRefund(refundedPayment, "admin-uid");
    }

    @Test
    void refundPayment_FailsIfAlreadyRefunded() {
        Payment payment = new Payment();
        payment.setPaymentId("pay-already");
        payment.setStatus("REFUNDED");

        when(paymentRepository.findById("pay-already")).thenReturn(Optional.of(payment));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> paymentService.refundPayment("pay-already", "admin-uid")
        );
        assertEquals("Payment is already refunded", ex.getMessage());
    }

    @Test
    void refundPayment_FailsIfNotCompleted() {
        Payment payment = new Payment();
        payment.setPaymentId("pay-not-completed");
        payment.setStatus("PENDING");

        when(paymentRepository.findById("pay-not-completed")).thenReturn(Optional.of(payment));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> paymentService.refundPayment("pay-not-completed", "admin-uid")
        );
        assertEquals("Only completed payments can be refunded", ex.getMessage());
    }
}
