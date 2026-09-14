package com.hotel.hotel_management.payment;

import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.Firestore;
import org.springframework.stereotype.Repository;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ExecutionException;

@Repository
public class PaymentRepository {

    private final Firestore firestore;

    public PaymentRepository(Firestore firestore) {
        this.firestore = firestore;
    }

    public Payment save(Payment payment) {

        DocumentReference document =
                firestore.collection("payments")
                        .document(payment.getPaymentId());

        Map<String, Object> data = new HashMap<>();

        data.put("paymentId", payment.getPaymentId());
        data.put("invoiceId", payment.getInvoiceId());
        data.put("reservationId", payment.getReservationId());
        data.put("customerUid", payment.getCustomerUid());
        data.put("amount", payment.getAmount());
        data.put("paymentMethod", payment.getPaymentMethod());
        data.put("status", payment.getStatus());
        data.put("createdAt", payment.getCreatedAt());
        data.put("updatedAt", payment.getUpdatedAt());

        try {
            document.set(data).get();
            return payment;

        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(
                    "Unable to save payment", exception);

        } catch (ExecutionException exception) {
            throw new IllegalStateException(
                    "Unable to save payment", exception);
        }
    }

    public Optional<Payment> findById(String paymentId) {

        DocumentReference document =
                firestore.collection("payments")
                        .document(paymentId);

        try {
            var snapshot = document.get().get();

            if (!snapshot.exists()) {
                return Optional.empty();
            }

            Payment payment = new Payment();

            payment.setPaymentId(
                    snapshot.getString("paymentId"));

            payment.setInvoiceId(
                    snapshot.getString("invoiceId"));

            payment.setReservationId(
                    snapshot.getString("reservationId"));

            payment.setCustomerUid(
                    snapshot.getString("customerUid"));

            payment.setAmount(
                    snapshot.getDouble("amount"));

            payment.setPaymentMethod(
                    snapshot.getString("paymentMethod"));

            payment.setStatus(
                    snapshot.getString("status"));

            if (snapshot.getTimestamp("createdAt") != null) {
                payment.setCreatedAt(
                        snapshot.getTimestamp("createdAt")
                                .toDate()
                                .toInstant());
            }

            if (snapshot.getTimestamp("updatedAt") != null) {
                payment.setUpdatedAt(
                        snapshot.getTimestamp("updatedAt")
                                .toDate()
                                .toInstant());
            }

            return Optional.of(payment);

        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(
                    "Unable to find payment", exception);

        } catch (ExecutionException exception) {
            throw new IllegalStateException(
                    "Unable to find payment", exception);
        }
    }

    public double getTotalPaidForInvoice(String invoiceId) {

    try {
        var documents =
                firestore.collection("payments")
                        .whereEqualTo("invoiceId", invoiceId)
                        .whereEqualTo(
                                "status",
                                PaymentStatus.COMPLETED.name())
                        .get()
                        .get()
                        .getDocuments();

        double total = 0.0;

        for (var document : documents) {

            Double amount =
                    document.getDouble("amount");

            if (amount != null) {
                total += amount;
            }
        }

        return total;

    } catch (InterruptedException exception) {
        Thread.currentThread().interrupt();
        throw new IllegalStateException(
                "Unable to calculate paid amount", exception);

    } catch (ExecutionException exception) {
        throw new IllegalStateException(
                "Unable to calculate paid amount", exception);
    }
}

public java.util.List<Payment> findByInvoiceId(
        String invoiceId) {

    try {
        var documents =
                firestore.collection("payments")
                        .whereEqualTo("invoiceId", invoiceId)
                        .get()
                        .get()
                        .getDocuments();

        java.util.List<Payment> payments =
                new java.util.ArrayList<>();

        for (var snapshot : documents) {

            Payment payment = new Payment();

            payment.setPaymentId(
                    snapshot.getString("paymentId"));

            payment.setInvoiceId(
                    snapshot.getString("invoiceId"));

            payment.setReservationId(
                    snapshot.getString("reservationId"));

            payment.setCustomerUid(
                    snapshot.getString("customerUid"));

            payment.setAmount(
                    snapshot.getDouble("amount"));

            payment.setPaymentMethod(
                    snapshot.getString("paymentMethod"));

            payment.setStatus(
                    snapshot.getString("status"));

            if (snapshot.getTimestamp("createdAt") != null) {
                payment.setCreatedAt(
                        snapshot.getTimestamp("createdAt")
                                .toDate()
                                .toInstant());
            }

            if (snapshot.getTimestamp("updatedAt") != null) {
                payment.setUpdatedAt(
                        snapshot.getTimestamp("updatedAt")
                                .toDate()
                                .toInstant());
            }

            payments.add(payment);
        }

        return payments;

    } catch (InterruptedException exception) {
        Thread.currentThread().interrupt();
        throw new IllegalStateException(
                "Unable to find payments", exception);

    } catch (ExecutionException exception) {
        throw new IllegalStateException(
                "Unable to find payments", exception);
    }
}
}