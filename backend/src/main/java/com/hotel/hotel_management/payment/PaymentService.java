package com.hotel.hotel_management.payment;

import com.hotel.hotel_management.finance.FinanceService;
import com.hotel.hotel_management.invoice.Invoice;
import com.hotel.hotel_management.invoice.InvoiceRepository;
import com.hotel.hotel_management.invoice.InvoiceStatus;
import com.hotel.hotel_management.reservation.Reservation;
import com.hotel.hotel_management.reservation.ReservationRepository;
import com.hotel.hotel_management.reservation.ReservationStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Records payments taken at the desk and keeps the invoice and the finance
 * ledger in step with them.
 *
 * A payment is an accounting event, not a gateway call: the receptionist takes
 * the money, then tells the system how much and by what method. Recording one
 * is what creates the matching finance income row, so the desk never writes to
 * the ledger directly.
 */
@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final InvoiceRepository invoiceRepository;
    private final FinanceService financeService;
    private final ReservationRepository reservationRepository;

    @Autowired
    public PaymentService(
            PaymentRepository paymentRepository,
            InvoiceRepository invoiceRepository,
            FinanceService financeService,
            ReservationRepository reservationRepository) {

        this.paymentRepository = paymentRepository;
        this.invoiceRepository = invoiceRepository;
        this.financeService = financeService;
        this.reservationRepository = reservationRepository;
    }

    public PaymentService(
            PaymentRepository paymentRepository,
            InvoiceRepository invoiceRepository,
            FinanceService financeService) {

        this(paymentRepository, invoiceRepository, financeService, null);
    }

    /**
     * @param performedBy Firebase uid of the staff member recording the payment
     */
    public Payment createPayment(CreatePaymentRequest request, String performedBy) {

        if (request.amount() == null || request.amount() <= 0) {
            throw new IllegalArgumentException(
                    "Payment amount must be greater than zero");
        }

        Invoice invoice = invoiceRepository.findById(request.invoiceId())
                .orElseThrow(() ->
                        new IllegalArgumentException("Invoice not found"));

        if (InvoiceStatus.PAID.name().equals(invoice.getStatus())) {
            throw new IllegalArgumentException(
                    "Invoice is already fully paid");
        }

        if (reservationRepository != null && invoice.getReservationId() != null) {
            Reservation reservation =
                    reservationRepository.findById(invoice.getReservationId()).orElse(null);
            if (reservation != null
                    && reservation.getStatus() == ReservationStatus.CANCELLED) {
                throw new IllegalArgumentException(
                        "Cannot record a payment for a cancelled reservation.");
            }
        }

        double totalPaid = paymentRepository.getTotalPaidForInvoice(invoice.getInvoiceId());
        double totalAmount = invoice.getTotalAmount() != null ? invoice.getTotalAmount() : 0.0;

        if (totalPaid + request.amount() > totalAmount) {
            throw new IllegalArgumentException(
                    "Payment amount exceeds remaining invoice balance of "
                            + String.format("%,.2f", Math.max(0.0, totalAmount - totalPaid)));
        }

        Instant now = Instant.now();

        Payment payment = new Payment();
        payment.setPaymentId(UUID.randomUUID().toString());
        payment.setInvoiceId(invoice.getInvoiceId());
        payment.setReservationId(invoice.getReservationId());
        payment.setAmount(request.amount());
        payment.setPaymentMethod(request.paymentMethod().name());
        payment.setStatus(PaymentStatus.COMPLETED.name());
        payment.setRecordedBy(performedBy);
        payment.setCreatedAt(now);
        payment.setUpdatedAt(now);

        Payment savedPayment = paymentRepository.save(payment);

        updateInvoiceStatus(invoice.getInvoiceId());

        // Finance income is derived here rather than accepted from the client,
        // and is keyed on the payment id so a retry cannot double-count it.
        financeService.recordPaymentIncome(savedPayment, performedBy);

        return savedPayment;
    }

    public Payment getPaymentById(String paymentId) {
        return paymentRepository.findById(paymentId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Payment not found"));
    }

    public List<Payment> getPaymentsByInvoice(String invoiceId) {

        invoiceRepository.findById(invoiceId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Invoice not found"));

        return paymentRepository.findByInvoiceId(invoiceId);
    }

    public List<Payment> getAllPayments() {
        return paymentRepository.findAll().stream()
                .sorted(java.util.Comparator.comparing(Payment::getCreatedAt,
                        java.util.Comparator.nullsLast(java.util.Comparator.reverseOrder())))
                .toList();
    }

    public Payment refundPayment(String paymentId, String performedBy) {

        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Payment not found"));

        if (payment.getStatus().equals(PaymentStatus.REFUNDED.name())) {
            throw new IllegalArgumentException("Payment is already refunded");
        }

        if (!payment.getStatus().equals(PaymentStatus.COMPLETED.name())) {
            throw new IllegalArgumentException("Only completed payments can be refunded");
        }

        Payment refundedPayment = paymentRepository.updateStatus(
                paymentId, PaymentStatus.REFUNDED);

        updateInvoiceStatus(payment.getInvoiceId());

        financeService.recordPaymentRefund(refundedPayment, performedBy);

        return refundedPayment;
    }

    /** Recomputes the invoice status from what has actually been settled. */
    public void updateInvoiceStatus(String invoiceId) {

        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Invoice not found"));

        double totalPaid = paymentRepository.getTotalPaidForInvoice(invoiceId);
        double totalAmount =
                invoice.getTotalAmount() != null ? invoice.getTotalAmount() : 0.0;

        if (totalPaid <= 0) {
            invoiceRepository.updateStatus(invoiceId, InvoiceStatus.UNPAID);
        } else if (totalPaid < totalAmount) {
            invoiceRepository.updateStatus(invoiceId, InvoiceStatus.PARTIALLY_PAID);
        } else {
            invoiceRepository.updateStatus(invoiceId, InvoiceStatus.PAID);
        }
    }

    public double getTotalPaidForInvoice(String invoiceId) {
        return paymentRepository.getTotalPaidForInvoice(invoiceId);
    }

    public boolean hasPaymentsForInvoice(String invoiceId) {
        return paymentRepository.hasPaymentsForInvoice(invoiceId);
    }

    public double getTotalRefundedForInvoice(String invoiceId) {
        return paymentRepository.getTotalRefundedForInvoice(invoiceId);
    }
}
