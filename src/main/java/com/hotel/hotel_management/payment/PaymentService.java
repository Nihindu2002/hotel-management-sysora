package com.hotel.hotel_management.payment;

import com.hotel.hotel_management.invoice.Invoice;
import com.hotel.hotel_management.invoice.InvoiceRepository;
import com.hotel.hotel_management.invoice.InvoiceStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final InvoiceRepository invoiceRepository;

    public PaymentService(
            PaymentRepository paymentRepository,
            InvoiceRepository invoiceRepository) {

        this.paymentRepository = paymentRepository;
        this.invoiceRepository = invoiceRepository;
    }

    public Payment createPayment(
            CreatePaymentRequest request,
            String customerUid) {

        Invoice invoice =
                invoiceRepository.findById(request.invoiceId())
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Invoice not found"));

        if (invoice.getStatus().equals("PAID")) {

            throw new IllegalArgumentException(
                    "Invoice is already fully paid");
        }

        if (customerUid != null
                && !invoice.getCustomerUid().equals(customerUid)) {

            throw new com.hotel.hotel_management.common.ForbiddenException(
                    "You are not authorized to pay this invoice");
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

        double updatedTotalPaid = totalPaid + request.amount();

        if (updatedTotalPaid >= invoice.getTotalAmount()) {

            invoiceRepository.updateStatus(
                    invoice.getInvoiceId(),
                    InvoiceStatus.PAID
            );

        } else {

            invoiceRepository.updateStatus(
                    invoice.getInvoiceId(),
                    InvoiceStatus.PARTIALLY_PAID
            );
        }

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
        return paymentRepository.save(payment);
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

    Invoice invoice =
            invoiceRepository.findById(payment.getInvoiceId())
                    .orElseThrow(() ->
                            new IllegalArgumentException(
                                    "Invoice not found"));

    double totalPaid =
            paymentRepository.getTotalPaidForInvoice(
                    invoice.getInvoiceId());

    if (totalPaid >= invoice.getTotalAmount()) {

        invoiceRepository.updateStatus(
                invoice.getInvoiceId(),
                InvoiceStatus.PAID);

    } else if (totalPaid > 0) {

        invoiceRepository.updateStatus(
                invoice.getInvoiceId(),
                InvoiceStatus.PARTIALLY_PAID);

    } else {

        invoiceRepository.updateStatus(
                invoice.getInvoiceId(),
                InvoiceStatus.UNPAID);
    }

    return refundedPayment;
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