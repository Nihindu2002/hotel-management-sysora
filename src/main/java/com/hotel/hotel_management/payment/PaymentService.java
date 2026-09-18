package com.hotel.hotel_management.payment;

import com.hotel.hotel_management.invoice.Invoice;
import com.hotel.hotel_management.invoice.InvoiceRepository;
import com.hotel.hotel_management.invoice.InvoiceStatus;
import com.hotel.hotel_management.finance.FinanceService;
import com.hotel.hotel_management.notification.NotificationService;
import com.hotel.hotel_management.notification.NotificationType;
import com.hotel.hotel_management.reservation.Reservation;
import com.hotel.hotel_management.reservation.ReservationRepository;
import com.hotel.hotel_management.reservation.ReservationStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final InvoiceRepository invoiceRepository;
    private final FinanceService financeService;
    private final ReservationRepository reservationRepository;
    private final NotificationService notificationService;

    @Autowired
    public PaymentService(
            PaymentRepository paymentRepository,
            InvoiceRepository invoiceRepository,
            FinanceService financeService,
            ReservationRepository reservationRepository,
            NotificationService notificationService) {

        this.paymentRepository = paymentRepository;
        this.invoiceRepository = invoiceRepository;
        this.financeService = financeService;
        this.reservationRepository = reservationRepository;
        this.notificationService = notificationService;
    }

    public PaymentService(
            PaymentRepository paymentRepository,
            InvoiceRepository invoiceRepository,
            FinanceService financeService) {

        this(paymentRepository, invoiceRepository, financeService, null, null);
    }

    public Payment createPayment(
            CreatePaymentRequest request,
            String customerUid) {
        return createPayment(request, customerUid, customerUid);
    }

    public Payment createPayment(
            CreatePaymentRequest request,
            String customerUid,
            String performedBy) {

        Invoice invoice =
                invoiceRepository.findById(request.invoiceId())
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Invoice not found"));

        if (InvoiceStatus.PAID.name().equals(invoice.getStatus())) {
            throw new IllegalArgumentException(
                    "Invoice is already fully paid");
        }

        if (customerUid != null
                && !invoice.getCustomerUid().equals(customerUid)) {
            throw new com.hotel.hotel_management.common.ForbiddenException(
                    "You are not authorized to pay this invoice");
        }

        if (reservationRepository != null && invoice.getReservationId() != null) {
            Reservation reservation =
                    reservationRepository.findById(invoice.getReservationId()).orElse(null);
            if (reservation != null) {
                if (reservation.getStatus() == ReservationStatus.PENDING) {
                    throw new IllegalArgumentException(
                            "Cannot make payment for a pending reservation. It must be confirmed by staff first.");
                }
                if (reservation.getStatus() == ReservationStatus.CANCELLED) {
                    throw new IllegalArgumentException(
                            "Cannot make payment for a cancelled reservation.");
                }
            }
        }

        double totalPaid =
                paymentRepository.getTotalPaidForInvoice(
                        invoice.getInvoiceId());

        if (totalPaid + request.amount()
                > invoice.getTotalAmount()) {
            throw new IllegalArgumentException(
                    "Payment amount exceeds remaining invoice balance");
        }

        Instant now = Instant.now();

        Payment payment = new Payment();
        payment.setPaymentId(UUID.randomUUID().toString());
        payment.setInvoiceId(invoice.getInvoiceId());
        payment.setReservationId(invoice.getReservationId());
        payment.setCustomerUid(invoice.getCustomerUid());

        payment.setAmount(request.amount());
        payment.setPaymentMethod(
                request.paymentMethod().name());

        payment.setStatus(
                PaymentStatus.COMPLETED.name());

        payment.setCreatedAt(now);
        payment.setUpdatedAt(now);
        Payment savedPayment = paymentRepository.save(payment);

        updateInvoiceStatus(invoice.getInvoiceId());

        financeService.recordPaymentIncome(savedPayment, performedBy);

        notifyCustomer(
                savedPayment.getCustomerUid(),
                NotificationType.PAYMENT,
                "Payment received",
                "Your payment of LKR " + formatAmount(savedPayment.getAmount())
                        + " was received successfully.",
                "/my-payments",
                savedPayment.getPaymentId());

        return savedPayment;
    }

    public Payment getPaymentById(
            String paymentId,
            String customerUid) {

        Payment payment =
                paymentRepository.findById(paymentId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Payment not found"));

        if (customerUid != null
                && !payment.getCustomerUid().equals(customerUid)) {

            throw new com.hotel.hotel_management.security.ForbiddenException(
                    "You are not authorized to view this payment");
        }

        return payment;
    }


    public java.util.List<Payment> getPaymentsByInvoice(
        String invoiceId,
        String customerUid) {

    Invoice invoice =
            invoiceRepository.findById(invoiceId)
                    .orElseThrow(() ->
                            new IllegalArgumentException(
                                    "Invoice not found"));

    if (customerUid != null
            && !invoice.getCustomerUid().equals(customerUid)) {

        throw new com.hotel.hotel_management.common.ForbiddenException(
                "You are not authorized to view these payments");
    }

    return paymentRepository.findByInvoiceId(invoiceId);
}

public java.util.List<Payment> getAllPayments() {
    return paymentRepository.findAll();
}
    public Payment refundPayment(String paymentId) {
        return refundPayment(paymentId, null);
    }

    public Payment refundPayment(String paymentId, String performedBy) {

        Payment payment =
                paymentRepository.findById(paymentId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Payment not found"));

        if (payment.getStatus().equals(
                PaymentStatus.REFUNDED.name())) {

            throw new IllegalArgumentException(
                    "Payment is already refunded");
        }

        if (!payment.getStatus().equals(
                PaymentStatus.COMPLETED.name())) {

            throw new IllegalArgumentException(
                    "Only completed payments can be refunded");
        }

        Payment refundedPayment =
                paymentRepository.updateStatus(
                        paymentId,
                        PaymentStatus.REFUNDED);

        updateInvoiceStatus(payment.getInvoiceId());

        financeService.recordPaymentRefund(refundedPayment, performedBy);

        notifyCustomer(
                refundedPayment.getCustomerUid(),
                NotificationType.PAYMENT,
                "Refund processed",
                "Your refund of LKR " + formatAmount(refundedPayment.getAmount())
                        + " has been processed.",
                "/my-payments",
                refundedPayment.getPaymentId());

        return refundedPayment;
    }

    /** Notifications are auxiliary; a null collaborator must not break payment. */
    private void notifyCustomer(
            String customerUid,
            NotificationType type,
            String title,
            String message,
            String link,
            String referenceId) {

        if (notificationService == null) {
            return;
        }

        notificationService.emit(customerUid, type, title, message, link, referenceId);
    }

    private String formatAmount(Double amount) {
        return String.format("%,.2f", amount != null ? amount : 0.0);
    }

    public void updateInvoiceStatus(String invoiceId) {
        Invoice invoice =
                invoiceRepository.findById(invoiceId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Invoice not found"));

        double totalPaid =
                paymentRepository.getTotalPaidForInvoice(invoiceId);
        double totalAmount =
                invoice.getTotalAmount() != null ? invoice.getTotalAmount() : 0.0;

        if (totalPaid <= 0) {
            invoiceRepository.updateStatus(
                    invoiceId,
                    InvoiceStatus.UNPAID);
        } else if (totalPaid < totalAmount) {
            invoiceRepository.updateStatus(
                    invoiceId,
                    InvoiceStatus.PARTIALLY_PAID);
        } else {
            invoiceRepository.updateStatus(
                    invoiceId,
                    InvoiceStatus.PAID);
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

public java.util.List<Payment> getCustomerPayments(String customerUid) {
    return paymentRepository.findByCustomerUid(customerUid);
}
}