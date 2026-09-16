package com.hotel.hotel_management.invoice;

import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.Firestore;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutionException;

@Repository
public class InvoiceRepository {

    private final Firestore firestore;

    public InvoiceRepository(Firestore firestore) {
        this.firestore = firestore;
    }

    public Invoice save(Invoice invoice) {

        DocumentReference document =
                firestore.collection("invoices")
                        .document(invoice.getInvoiceId());

        Map<String, Object> data = new HashMap<>();

        data.put("invoiceId", invoice.getInvoiceId());
        data.put("reservationId", invoice.getReservationId());
        data.put("customerUid", invoice.getCustomerUid());
        data.put("roomId", invoice.getRoomId());
        data.put("roomCharge", invoice.getRoomCharge());
        data.put("additionalCharges", invoice.getAdditionalCharges());
        data.put("discount", invoice.getDiscount());
        data.put("totalAmount", invoice.getTotalAmount());
        data.put("status", invoice.getStatus());
        data.put("createdAt", invoice.getCreatedAt());
        data.put("updatedAt", invoice.getUpdatedAt());

        try {
            document.set(data).get();
            return invoice;

        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(
                    "Unable to save invoice", exception);

        } catch (ExecutionException exception) {
            throw new IllegalStateException(
                    "Unable to save invoice", exception);
        }
    }

    public java.util.Optional<Invoice> findById(String invoiceId) {

    DocumentReference document =
            firestore.collection("invoices")
                    .document(invoiceId);

    try {
        var snapshot = document.get().get();

        if (!snapshot.exists()) {
            return java.util.Optional.empty();
        }

        Invoice invoice = new Invoice();

        invoice.setInvoiceId(snapshot.getString("invoiceId"));
        invoice.setReservationId(snapshot.getString("reservationId"));
        invoice.setCustomerUid(snapshot.getString("customerUid"));
        invoice.setRoomId(snapshot.getString("roomId"));

        invoice.setRoomCharge(
                snapshot.getDouble("roomCharge"));

        invoice.setAdditionalCharges(
                snapshot.getDouble("additionalCharges"));

        invoice.setDiscount(
                snapshot.getDouble("discount"));

        invoice.setTotalAmount(
                snapshot.getDouble("totalAmount"));

        invoice.setStatus(
                snapshot.getString("status"));

        invoice.setCreatedAt(
                snapshot.getTimestamp("createdAt")
                        .toDate()
                        .toInstant());

        invoice.setUpdatedAt(
                snapshot.getTimestamp("updatedAt")
                        .toDate()
                        .toInstant());

        return java.util.Optional.of(invoice);

    } catch (InterruptedException exception) {
        Thread.currentThread().interrupt();
        throw new IllegalStateException(
                "Unable to find invoice", exception);

    } catch (ExecutionException exception) {
        throw new IllegalStateException(
                "Unable to find invoice", exception);
    }
}

public java.util.Optional<Invoice> findByReservationId(
        String reservationId) {

    try {
        var documents =
                firestore.collection("invoices")
                        .whereEqualTo("reservationId", reservationId)
                        .get()
                        .get()
                        .getDocuments();

        if (documents.isEmpty()) {
            return java.util.Optional.empty();
        }

        var snapshot = documents.get(0);

        Invoice invoice = new Invoice();

        invoice.setInvoiceId(snapshot.getString("invoiceId"));
        invoice.setReservationId(snapshot.getString("reservationId"));
        invoice.setCustomerUid(snapshot.getString("customerUid"));
        invoice.setRoomId(snapshot.getString("roomId"));
        invoice.setRoomCharge(snapshot.getDouble("roomCharge"));
        invoice.setAdditionalCharges(
                snapshot.getDouble("additionalCharges"));
        invoice.setDiscount(snapshot.getDouble("discount"));
        invoice.setTotalAmount(snapshot.getDouble("totalAmount"));
        invoice.setStatus(snapshot.getString("status"));

        if (snapshot.getTimestamp("createdAt") != null) {
            invoice.setCreatedAt(
                    snapshot.getTimestamp("createdAt")
                            .toDate()
                            .toInstant());
        }

        if (snapshot.getTimestamp("updatedAt") != null) {
            invoice.setUpdatedAt(
                    snapshot.getTimestamp("updatedAt")
                            .toDate()
                            .toInstant());
        }

        return java.util.Optional.of(invoice);

    } catch (InterruptedException exception) {
        Thread.currentThread().interrupt();
        throw new IllegalStateException(
                "Unable to find invoice by reservation", exception);

    } catch (ExecutionException exception) {
        throw new IllegalStateException(
                "Unable to find invoice by reservation", exception);
    }
}

public Invoice updateStatus(
        String invoiceId,
        InvoiceStatus status) {

    DocumentReference document =
            firestore.collection("invoices")
                    .document(invoiceId);

    Map<String, Object> updates = new HashMap<>();

    updates.put("status", status.name());
    updates.put("updatedAt", java.time.Instant.now());

    try {
        document.update(updates).get();

        return findById(invoiceId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Invoice not found"));

    } catch (InterruptedException exception) {
        Thread.currentThread().interrupt();
        throw new IllegalStateException(
                "Unable to update invoice status", exception);

    } catch (ExecutionException exception) {
        throw new IllegalStateException(
                "Unable to update invoice status", exception);
    }
}

public java.util.List<Invoice> findByCustomerUid(
        String customerUid) {

    try {
        var documents =
                firestore.collection("invoices")
                        .whereEqualTo("customerUid", customerUid)
                        .get()
                        .get()
                        .getDocuments();

        java.util.List<Invoice> invoices =
                new java.util.ArrayList<>();

        for (var snapshot : documents) {

            Invoice invoice = new Invoice();

            invoice.setInvoiceId(
                    snapshot.getString("invoiceId"));

            invoice.setReservationId(
                    snapshot.getString("reservationId"));

            invoice.setCustomerUid(
                    snapshot.getString("customerUid"));

            invoice.setRoomId(
                    snapshot.getString("roomId"));

            invoice.setRoomCharge(
                    snapshot.getDouble("roomCharge"));

            invoice.setAdditionalCharges(
                    snapshot.getDouble("additionalCharges"));

            invoice.setDiscount(
                    snapshot.getDouble("discount"));

            invoice.setTotalAmount(
                    snapshot.getDouble("totalAmount"));

            invoice.setStatus(
                    snapshot.getString("status"));

            if (snapshot.getTimestamp("createdAt") != null) {
                invoice.setCreatedAt(
                        snapshot.getTimestamp("createdAt")
                                .toDate()
                                .toInstant());
            }

            if (snapshot.getTimestamp("updatedAt") != null) {
                invoice.setUpdatedAt(
                        snapshot.getTimestamp("updatedAt")
                                .toDate()
                                .toInstant());
            }

            invoices.add(invoice);
        }

        return invoices;

    } catch (InterruptedException exception) {
        Thread.currentThread().interrupt();
        throw new IllegalStateException(
                "Unable to find customer invoices", exception);

    } catch (ExecutionException exception) {
        throw new IllegalStateException(
                "Unable to find customer invoices", exception);
    }
}

public java.util.List<Invoice> findAll() {

    try {
        var documents =
                firestore.collection("invoices")
                        .get()
                        .get()
                        .getDocuments();

        java.util.List<Invoice> invoices =
                new java.util.ArrayList<>();

        for (var snapshot : documents) {

            Invoice invoice = new Invoice();

            invoice.setInvoiceId(
                    snapshot.getString("invoiceId"));

            invoice.setReservationId(
                    snapshot.getString("reservationId"));

            invoice.setCustomerUid(
                    snapshot.getString("customerUid"));

            invoice.setRoomId(
                    snapshot.getString("roomId"));

            invoice.setRoomCharge(
                    snapshot.getDouble("roomCharge"));

            invoice.setAdditionalCharges(
                    snapshot.getDouble("additionalCharges"));

            invoice.setDiscount(
                    snapshot.getDouble("discount"));

            invoice.setTotalAmount(
                    snapshot.getDouble("totalAmount"));

            invoice.setStatus(
                    snapshot.getString("status"));

            if (snapshot.getTimestamp("createdAt") != null) {
                invoice.setCreatedAt(
                        snapshot.getTimestamp("createdAt")
                                .toDate()
                                .toInstant());
            }

            if (snapshot.getTimestamp("updatedAt") != null) {
                invoice.setUpdatedAt(
                        snapshot.getTimestamp("updatedAt")
                                .toDate()
                                .toInstant());
            }

            invoices.add(invoice);
        }

        return invoices;

    } catch (InterruptedException exception) {
        Thread.currentThread().interrupt();
        throw new IllegalStateException(
                "Unable to find invoices", exception);

    } catch (ExecutionException exception) {
        throw new IllegalStateException(
                "Unable to find invoices", exception);
    }
}

public Invoice updateAmounts(
        String invoiceId,
        Double additionalCharges,
        Double discount,
        Double totalAmount) {

    DocumentReference document =
            firestore.collection("invoices")
                    .document(invoiceId);

    Map<String, Object> updates = new HashMap<>();

    updates.put("additionalCharges", additionalCharges);
    updates.put("discount", discount);
    updates.put("totalAmount", totalAmount);
    updates.put("updatedAt", Instant.now());

    try {
        document.update(updates).get();

        return findById(invoiceId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Invoice not found"));

    } catch (InterruptedException exception) {
        Thread.currentThread().interrupt();
        throw new IllegalStateException(
                "Unable to update invoice", exception);

    } catch (ExecutionException exception) {
        throw new IllegalStateException(
                "Unable to update invoice", exception);
    }
}


public void delete(String invoiceId) {

    DocumentReference document =
            firestore.collection("invoices")
                    .document(invoiceId);

    try {
        document.delete().get();

    } catch (InterruptedException exception) {
        Thread.currentThread().interrupt();
        throw new IllegalStateException(
                "Unable to delete invoice",
                exception);

    } catch (ExecutionException exception) {
        throw new IllegalStateException(
                "Unable to delete invoice",
                exception);
    }
}
}