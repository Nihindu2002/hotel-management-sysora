package com.hotel.hotel_management.invoice;

import com.hotel.hotel_management.payment.Payment;
import com.hotel.hotel_management.payment.PaymentService;
import com.hotel.hotel_management.reservation.Reservation;
import com.hotel.hotel_management.reservation.ReservationRepository;
import com.hotel.hotel_management.reservation.ReservationStatus;
import com.hotel.hotel_management.room.Room;
import com.hotel.hotel_management.room.RoomRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Owns the invoice record: one per reservation, priced by {@link BillingService}.
 *
 * The desk can regenerate a bill as many times as it likes before checkout —
 * each regeneration replaces the stored breakdown rather than stacking a second
 * invoice on the same stay.
 */
@Service
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final ReservationRepository reservationRepository;
    private final RoomRepository roomRepository;
    private final PaymentService paymentService;
    private final BillingService billingService;

    @Autowired
    public InvoiceService(
            InvoiceRepository invoiceRepository,
            ReservationRepository reservationRepository,
            RoomRepository roomRepository,
            @Lazy PaymentService paymentService,
            BillingService billingService) {

        this.invoiceRepository = invoiceRepository;
        this.reservationRepository = reservationRepository;
        this.roomRepository = roomRepository;
        this.paymentService = paymentService;
        this.billingService = billingService;
    }

    /** Test wiring without a payment service. */
    public InvoiceService(
            InvoiceRepository invoiceRepository,
            ReservationRepository reservationRepository,
            RoomRepository roomRepository,
            BillingService billingService) {

        this(invoiceRepository, reservationRepository, roomRepository, null, billingService);
    }

    /**
     * Creates the accommodation-only invoice for a reservation.
     *
     * @throws IllegalArgumentException if the reservation is unknown, pending,
     *         cancelled, or already has an invoice.
     */
    public Invoice createInvoice(String reservationId) {

        // Duplicate check first: it is the cheaper lookup, and "already
        // invoiced" is the more useful answer than "reservation not found" when
        // a caller retries a create.
        if (invoiceRepository.findByReservationId(reservationId).isPresent()) {
            throw new IllegalArgumentException(
                    "Invoice already exists for this reservation");
        }

        Reservation reservation = loadBillableReservation(reservationId);

        Instant now = Instant.now();
        return writeInvoice(
                UUID.randomUUID().toString(),
                now,
                now,
                reservation,
                billingService.calculateRoomChargeOnly(reservation));
    }

    /**
     * Returns the reservation's invoice, creating the accommodation-only version if the
     * stay does not have one yet. Used by the confirmation flow, which should
     * never fail just because an invoice is already on file.
     */
    public Invoice ensureInvoice(Reservation reservation) {
        return invoiceRepository.findByReservationId(reservation.getReservationId())
                .orElseGet(() -> {
                    Instant now = Instant.now();
                    return writeInvoice(
                            UUID.randomUUID().toString(),
                            now,
                            now,
                            reservation,
                            billingService.calculateRoomChargeOnly(reservation));
                });
    }

    /**
     * Reprices the reservation's bill from the charge lines and discount the
     * desk entered, and stores the result. Passing empty charges and no
     * discount resets the bill to the room charge alone.
     */
    public Invoice applyBill(
            Reservation reservation,
            List<AdditionalCharge> charges,
            DiscountType discountType,
            Double discountValue) {

        Invoice existing = ensureInvoice(reservation);
        BillBreakdown breakdown =
                billingService.calculate(reservation, charges, discountType, discountValue);

        double alreadyPaid = paymentService != null
                ? paymentService.getTotalPaidForInvoice(existing.getInvoiceId())
                : 0.0;

        if (breakdown.totalAmount() < alreadyPaid) {
            throw new IllegalArgumentException(
                    "Bill total cannot be less than the amount already paid");
        }

        // Rewrites the existing document in place: repricing a bill must never
        // leave a second invoice (or an orphaned one) behind.
        Invoice repriced = writeInvoice(
                existing.getInvoiceId(),
                existing.getCreatedAt() != null ? existing.getCreatedAt() : Instant.now(),
                Instant.now(),
                reservation,
                breakdown);

        if (paymentService != null) {
            paymentService.updateInvoiceStatus(repriced.getInvoiceId());
        }

        return enrichInvoice(repriced);
    }

    public Invoice getInvoiceById(String invoiceId) {
        return enrichInvoice(invoiceRepository.findById(invoiceId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Invoice not found")));
    }

    public List<Invoice> getAllInvoices() {

        List<Invoice> invoices = invoiceRepository.findAll();
        if (invoices == null || invoices.isEmpty()) {
            return List.of();
        }

        // One pass over the payment ledger rather than a query per invoice.
        Map<String, Double> paidByInvoiceId = completedPaymentsByInvoice();

        invoices.forEach(invoice -> applyPaymentTotals(invoice, paidByInvoiceId));
        return invoices;
    }

    public Invoice getInvoiceByReservationId(String reservationId) {
        return invoiceRepository.findByReservationId(reservationId)
                .map(this::enrichInvoice)
                .orElse(null);
    }

    public Invoice enrichInvoice(Invoice invoice) {

        if (invoice == null) {
            return null;
        }

        double paid = paymentService != null
                ? paymentService.getTotalPaidForInvoice(invoice.getInvoiceId())
                : 0.0;

        applyPaymentTotals(invoice, Map.of(invoice.getInvoiceId(), paid));
        return invoice;
    }

    /**
     * Recomputes UNPAID / PARTIALLY_PAID / PAID from what has actually been
     * settled. The client never sends a status.
     */
    public Invoice recalculateInvoiceStatus(String invoiceId) {

        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found"));

        double totalPaid = paymentService != null
                ? paymentService.getTotalPaidForInvoice(invoiceId) : 0.0;
        double totalAmount = invoice.getTotalAmount() != null ? invoice.getTotalAmount() : 0.0;

        InvoiceStatus newStatus;
        if (totalPaid <= 0) {
            newStatus = InvoiceStatus.UNPAID;
        } else if (totalPaid < totalAmount) {
            newStatus = InvoiceStatus.PARTIALLY_PAID;
        } else {
            newStatus = InvoiceStatus.PAID;
        }

        return invoiceRepository.updateStatus(invoiceId, newStatus);
    }

    public void deleteInvoice(String invoiceId) {

        getInvoiceById(invoiceId);

        double totalPaid = paymentService != null
                ? paymentService.getTotalPaidForInvoice(invoiceId) : 0.0;

        if (totalPaid > 0) {
            throw new IllegalArgumentException(
                    "Cannot delete an invoice that has payments");
        }

        invoiceRepository.delete(invoiceId);
    }

    // ── Internals ──

    private Reservation loadBillableReservation(String reservationId) {

        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Reservation not found"));

        if (reservation.getStatus() == ReservationStatus.CANCELLED) {
            throw new IllegalArgumentException(
                    "Cannot create an invoice for a cancelled reservation.");
        }

        if (reservation.getStatus() == ReservationStatus.PENDING) {
            throw new IllegalArgumentException(
                    "Cannot create an invoice for a pending reservation. It must be confirmed by staff first.");
        }

        return reservation;
    }

    private Invoice writeInvoice(
            String invoiceId,
            Instant createdAt,
            Instant updatedAt,
            Reservation reservation,
            BillBreakdown breakdown) {

        Room room = roomRepository.findById(reservation.getRoomId()).orElse(null);

        Invoice invoice = new Invoice();

        invoice.setInvoiceId(invoiceId);
        invoice.setReservationId(reservation.getReservationId());
        invoice.setRoomId(reservation.getRoomId());
        invoice.setRoomNumber(room != null ? room.getRoomNumber() : null);
        invoice.setCustomerName(reservation.getCustomerName());
        invoice.setBoardPackage(reservation.getBoardPackage());
        invoice.setPackagePricePerNight(reservation.getPackagePricePerNight());

        invoice.setCheckInDate(reservation.getCheckInDate());
        invoice.setCheckOutDate(reservation.getCheckOutDate());
        invoice.setNights(breakdown.nights());

        invoice.setRoomCharge(breakdown.roomCharge());
        invoice.setAdditionalCharges(breakdown.additionalCharges());
        invoice.setAdditionalChargesTotal(breakdown.additionalChargesTotal());

        invoice.setDiscountType(breakdown.discountType());
        invoice.setDiscountValue(breakdown.discountValue());
        invoice.setDiscountAmount(breakdown.discountAmount());

        invoice.setSubtotal(breakdown.subtotal());
        invoice.setTaxRate(breakdown.taxRate());
        invoice.setTaxAmount(breakdown.taxAmount());
        invoice.setTotalAmount(breakdown.totalAmount());

        invoice.setStatus(InvoiceStatus.UNPAID.name());

        invoice.setCreatedAt(createdAt);
        invoice.setUpdatedAt(updatedAt);

        return invoiceRepository.save(invoice);
    }

    private Map<String, Double> completedPaymentsByInvoice() {

        List<Payment> payments = paymentService != null
                ? paymentService.getAllPayments() : List.of();

        return (payments != null ? payments : List.<Payment>of()).stream()
                .filter(p -> "COMPLETED".equalsIgnoreCase(p.getStatus()))
                .filter(p -> p.getAmount() != null && p.getInvoiceId() != null)
                .collect(Collectors.groupingBy(
                        Payment::getInvoiceId,
                        Collectors.summingDouble(Payment::getAmount)));
    }

    private void applyPaymentTotals(Invoice invoice, Map<String, Double> paidByInvoiceId) {

        double paid = paidByInvoiceId.getOrDefault(invoice.getInvoiceId(), 0.0);
        double total = invoice.getTotalAmount() != null ? invoice.getTotalAmount() : 0.0;

        invoice.setPaidAmount(paid);
        invoice.setRemainingAmount(Math.max(0.0, total - paid));
    }
}
