package com.hotel.hotel_management.invoice;

import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ExecutionException;

@Repository
public class InvoiceRepository {

    private final Firestore firestore;

    public InvoiceRepository(Firestore firestore) {
        this.firestore = firestore;
    }

    /**
     * Writes the whole invoice. {@code set} replaces the document rather than
     * merging, which is what the billing flow wants: when the desk regenerates
     * the final bill the stored breakdown must match the new calculation
     * exactly, including any charge lines that were removed.
     */
    public Invoice save(Invoice invoice) {

        DocumentReference document =
                firestore.collection("invoices")
                        .document(invoice.getInvoiceId());

        Map<String, Object> data = new HashMap<>();

        data.put("invoiceId", invoice.getInvoiceId());
        data.put("reservationId", invoice.getReservationId());
        data.put("roomId", invoice.getRoomId());
        data.put("roomNumber", invoice.getRoomNumber());
        data.put("customerName", invoice.getCustomerName());

        data.put("checkInDate", invoice.getCheckInDate() != null
                ? invoice.getCheckInDate().toString() : null);
        data.put("checkOutDate", invoice.getCheckOutDate() != null
                ? invoice.getCheckOutDate().toString() : null);
        data.put("nights", invoice.getNights());

        data.put("roomCharge", invoice.getRoomCharge());
        data.put("additionalCharges", toMaps(invoice.getAdditionalCharges()));
        data.put("additionalChargesTotal", invoice.getAdditionalChargesTotal());

        data.put("discountType", invoice.getDiscountType() != null
                ? invoice.getDiscountType().name() : null);
        data.put("discountValue", invoice.getDiscountValue());
        data.put("discountAmount", invoice.getDiscountAmount());

        data.put("subtotal", invoice.getSubtotal());
        data.put("taxRate", invoice.getTaxRate());
        data.put("taxAmount", invoice.getTaxAmount());
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

    public Optional<Invoice> findById(String invoiceId) {

        DocumentReference document =
                firestore.collection("invoices")
                        .document(invoiceId);

        try {
            DocumentSnapshot snapshot = document.get().get();

            return snapshot.exists()
                    ? Optional.of(toInvoice(snapshot))
                    : Optional.empty();

        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(
                    "Unable to find invoice", exception);

        } catch (ExecutionException exception) {
            throw new IllegalStateException(
                    "Unable to find invoice", exception);
        }
    }

    /**
     * There is one invoice per reservation, so the first match is the invoice.
     */
    public Optional<Invoice> findByReservationId(String reservationId) {

        try {
            var documents =
                    firestore.collection("invoices")
                            .whereEqualTo("reservationId", reservationId)
                            .get()
                            .get()
                            .getDocuments();

            if (documents.isEmpty()) {
                return Optional.empty();
            }

            return Optional.of(toInvoice(documents.get(0)));

        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(
                    "Unable to find invoice by reservation", exception);

        } catch (ExecutionException exception) {
            throw new IllegalStateException(
                    "Unable to find invoice by reservation", exception);
        }
    }

    public List<Invoice> findAll() {

        try {
            return firestore.collection("invoices")
                    .get()
                    .get()
                    .getDocuments()
                    .stream()
                    .map(this::toInvoice)
                    .toList();

        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(
                    "Unable to find invoices", exception);

        } catch (ExecutionException exception) {
            throw new IllegalStateException(
                    "Unable to find invoices", exception);
        }
    }

    public Invoice updateStatus(String invoiceId, InvoiceStatus status) {

        DocumentReference document =
                firestore.collection("invoices")
                        .document(invoiceId);

        Map<String, Object> updates = new HashMap<>();
        updates.put("status", status.name());
        updates.put("updatedAt", Instant.now());

        try {
            document.update(updates).get();

            return findById(invoiceId)
                    .orElseThrow(() ->
                            new IllegalArgumentException("Invoice not found"));

        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(
                    "Unable to update invoice status", exception);

        } catch (ExecutionException exception) {
            throw new IllegalStateException(
                    "Unable to update invoice status", exception);
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
                    "Unable to delete invoice", exception);

        } catch (ExecutionException exception) {
            throw new IllegalStateException(
                    "Unable to delete invoice", exception);
        }
    }

    // ── Mapping ──

    private List<Map<String, Object>> toMaps(List<AdditionalCharge> charges) {
        List<Map<String, Object>> maps = new ArrayList<>();
        if (charges == null) {
            return maps;
        }
        for (AdditionalCharge charge : charges) {
            Map<String, Object> map = new HashMap<>();
            map.put("description", charge.description());
            map.put("amount", charge.amount());
            maps.add(map);
        }
        return maps;
    }

    private Invoice toInvoice(DocumentSnapshot snapshot) {

        Invoice invoice = new Invoice();

        invoice.setInvoiceId(snapshot.getString("invoiceId"));
        invoice.setReservationId(snapshot.getString("reservationId"));
        invoice.setRoomId(snapshot.getString("roomId"));
        invoice.setRoomNumber(snapshot.getString("roomNumber"));
        invoice.setCustomerName(snapshot.getString("customerName"));

        invoice.setCheckInDate(readLocalDate(snapshot, "checkInDate"));
        invoice.setCheckOutDate(readLocalDate(snapshot, "checkOutDate"));

        Long nights = snapshot.getLong("nights");
        invoice.setNights(nights);

        invoice.setRoomCharge(readDouble(snapshot, "roomCharge"));
        invoice.setAdditionalCharges(readCharges(snapshot));
        invoice.setAdditionalChargesTotal(readDouble(snapshot, "additionalChargesTotal"));

        String discountType = snapshot.getString("discountType");
        invoice.setDiscountType(discountType != null
                ? DiscountType.valueOf(discountType) : DiscountType.NONE);
        invoice.setDiscountValue(readDouble(snapshot, "discountValue"));
        invoice.setDiscountAmount(readDouble(snapshot, "discountAmount"));

        invoice.setSubtotal(readDouble(snapshot, "subtotal"));
        invoice.setTaxRate(readDouble(snapshot, "taxRate"));
        invoice.setTaxAmount(readDouble(snapshot, "taxAmount"));
        invoice.setTotalAmount(readDouble(snapshot, "totalAmount"));

        invoice.setStatus(snapshot.getString("status"));

        if (snapshot.getTimestamp("createdAt") != null) {
            invoice.setCreatedAt(
                    snapshot.getTimestamp("createdAt").toDate().toInstant());
        }

        if (snapshot.getTimestamp("updatedAt") != null) {
            invoice.setUpdatedAt(
                    snapshot.getTimestamp("updatedAt").toDate().toInstant());
        }

        return invoice;
    }

    /**
     * Reads the itemised charge lines.
     *
     * Invoices written before charges were itemised stored a single
     * {@code additionalCharges} total as a number. Those are surfaced as one
     * unnamed line rather than dropped, so an old invoice still adds up.
     */
    private List<AdditionalCharge> readCharges(DocumentSnapshot snapshot) {

        List<AdditionalCharge> charges = new ArrayList<>();
        Object raw = snapshot.get("additionalCharges");

        if (raw instanceof List<?> list) {
            for (Object item : list) {
                if (!(item instanceof Map<?, ?> map)) {
                    continue;
                }
                Object description = map.get("description");
                Object amount = map.get("amount");
                charges.add(new AdditionalCharge(
                        description != null ? description.toString() : "Additional charge",
                        amount instanceof Number number ? number.doubleValue() : 0.0));
            }
        } else if (raw instanceof Number legacy && legacy.doubleValue() > 0) {
            charges.add(new AdditionalCharge(
                    "Additional charges", legacy.doubleValue()));
        }

        return charges;
    }

    private Double readDouble(DocumentSnapshot snapshot, String field) {
        Object value = snapshot.get(field);
        return value instanceof Number number ? number.doubleValue() : null;
    }

    private LocalDate readLocalDate(DocumentSnapshot snapshot, String field) {
        String value = snapshot.getString(field);
        return value != null ? LocalDate.parse(value) : null;
    }
}
