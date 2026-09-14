package com.hotel.hotel_management.payment;

import com.hotel.hotel_management.invoice.Invoice;
import com.hotel.hotel_management.invoice.InvoiceRepository;
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
                    com.hotel.hotel_management.invoice.InvoiceStatus.PAID
            );

        } else {

            invoiceRepository.updateStatus(
                    invoice.getInvoiceId(),
                    com.hotel.hotel_management.invoice.InvoiceStatus.PARTIALLY_PAID
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

    public Payment getPaymentById(String paymentId) {

        return paymentRepository.findById(paymentId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Payment not found"));
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
}