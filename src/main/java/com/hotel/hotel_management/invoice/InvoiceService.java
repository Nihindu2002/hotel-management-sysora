package com.hotel.hotel_management.invoice;

import com.hotel.hotel_management.payment.Payment;
import com.hotel.hotel_management.payment.PaymentService;
import com.hotel.hotel_management.reservation.Reservation;
import com.hotel.hotel_management.reservation.ReservationRepository;
import com.hotel.hotel_management.reservation.ReservationStatus;
import com.hotel.hotel_management.room.Room;
import com.hotel.hotel_management.room.RoomRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final ReservationRepository reservationRepository;
    private final RoomRepository roomRepository;
    private final PaymentService paymentService;

    public InvoiceService(
            InvoiceRepository invoiceRepository,
            ReservationRepository reservationRepository,
            RoomRepository roomRepository,
            PaymentService paymentService) {

        this.invoiceRepository = invoiceRepository;
        this.reservationRepository = reservationRepository;
        this.roomRepository = roomRepository;
        this.paymentService = paymentService;
    }

    public Invoice createInvoice(String reservationId) {

        Invoice existingInvoice =
                invoiceRepository.findByReservationId(reservationId)
                        .orElse(null);

        if (existingInvoice != null) {
            throw new IllegalArgumentException(
                    "Invoice already exists for this reservation");
        }

        Reservation reservation =
                reservationRepository.findById(reservationId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Reservation not found"));

        if (reservation.getStatus() == ReservationStatus.PENDING) {
            throw new IllegalArgumentException(
                    "Cannot create invoice for a pending reservation. It must be confirmed by staff first.");
        }

        if (reservation.getStatus() == ReservationStatus.CANCELLED) {
            throw new IllegalArgumentException(
                    "Cannot create invoice for a cancelled reservation.");
        }

        Room room =
                roomRepository.findById(reservation.getRoomId())
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Room not found"));

        long nights =
                ChronoUnit.DAYS.between(
                        reservation.getCheckInDate(),
                        reservation.getCheckOutDate());

        if (nights <= 0) {
            throw new IllegalArgumentException(
                    "Reservation must have at least one night");
        }

        double roomCharge =
                nights * room.getPricePerNight();

        Instant now = Instant.now();

        Invoice invoice = new Invoice();

        invoice.setInvoiceId(UUID.randomUUID().toString());
        invoice.setReservationId(reservation.getReservationId());
        invoice.setCustomerUid(reservation.getCustomerUid());
        invoice.setRoomId(reservation.getRoomId());

        invoice.setRoomCharge(roomCharge);
        invoice.setAdditionalCharges(0.0);
        invoice.setDiscount(0.0);
        invoice.setTotalAmount(roomCharge);

        invoice.setStatus(InvoiceStatus.UNPAID.name());

        invoice.setCreatedAt(now);
        invoice.setUpdatedAt(now);

        return invoiceRepository.save(invoice);
    }

    public Invoice getInvoiceById(String invoiceId) {

        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Invoice not found"));

        return enrichInvoice(invoice);
    }

    public List<Invoice> getAllInvoices() {
        List<Invoice> invoices = invoiceRepository.findAll();
        if (invoices == null || invoices.isEmpty()) {
            return List.of();
        }

        List<Payment> payments = paymentService.getAllPayments();
        Map<String, Double> paidByInvoiceId = (payments != null ? payments : List.<Payment>of()).stream()
                .filter(p -> "COMPLETED".equalsIgnoreCase(p.getStatus()))
                .filter(p -> p.getAmount() != null && p.getInvoiceId() != null)
                .collect(Collectors.groupingBy(
                        Payment::getInvoiceId,
                        Collectors.summingDouble(Payment::getAmount)
                ));

        return invoices.stream()
                .map(invoice -> {
                    double paid = paidByInvoiceId.getOrDefault(invoice.getInvoiceId(), 0.0);
                    invoice.setPaidAmount(paid);
                    double total = invoice.getTotalAmount() != null ? invoice.getTotalAmount() : 0.0;
                    invoice.setRemainingAmount(Math.max(0.0, total - paid));
                    return invoice;
                })
                .toList();
    }

    public List<Invoice> getMyInvoices(String customerUid) {
        List<Invoice> invoices = invoiceRepository.findByCustomerUid(customerUid);
        if (invoices == null || invoices.isEmpty()) {
            return List.of();
        }

        List<Payment> payments = paymentService.getCustomerPayments(customerUid);
        Map<String, Double> paidByInvoiceId = (payments != null ? payments : List.<Payment>of()).stream()
                .filter(p -> "COMPLETED".equalsIgnoreCase(p.getStatus()))
                .filter(p -> p.getAmount() != null && p.getInvoiceId() != null)
                .collect(Collectors.groupingBy(
                        Payment::getInvoiceId,
                        Collectors.summingDouble(Payment::getAmount)
                ));

        return invoices.stream()
                .map(invoice -> {
                    double paid = paidByInvoiceId.getOrDefault(invoice.getInvoiceId(), 0.0);
                    invoice.setPaidAmount(paid);
                    double total = invoice.getTotalAmount() != null ? invoice.getTotalAmount() : 0.0;
                    invoice.setRemainingAmount(Math.max(0.0, total - paid));
                    return invoice;
                })
                .toList();
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

        double paid = paymentService.getTotalPaidForInvoice(invoice.getInvoiceId());
        invoice.setPaidAmount(paid);

        double total = invoice.getTotalAmount() != null ? invoice.getTotalAmount() : 0.0;
        invoice.setRemainingAmount(Math.max(0.0, total - paid));

        return invoice;
    }

    public Invoice updateInvoiceAmounts(
            String invoiceId,
            UpdateInvoiceRequest request) {

        Invoice invoice = getInvoiceById(invoiceId);

        double totalAmount =
                invoice.getRoomCharge()
                        + request.additionalCharges()
                        - request.discount();

        if (totalAmount < 0) {
            throw new IllegalArgumentException(
                    "Invoice total cannot be negative");
        }

        double totalPaid =
                paymentService.getTotalPaidForInvoice(invoiceId);

        if (totalAmount < totalPaid) {
            throw new IllegalArgumentException(
                    "Invoice total cannot be less than the amount already paid");
        }

        invoiceRepository.updateAmounts(
                invoiceId,
                request.additionalCharges(),
                request.discount(),
                totalAmount);

        return recalculateInvoiceStatus(invoiceId);
    }

    public Invoice recalculateInvoiceStatus(String invoiceId) {
        Invoice invoice = getInvoiceById(invoiceId);
        double totalPaid =
                paymentService.getTotalPaidForInvoice(invoiceId);
        double totalAmount =
                invoice.getTotalAmount() != null ? invoice.getTotalAmount() : 0.0;

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

        Invoice invoice = getInvoiceById(invoiceId);

        double totalPaid =
                paymentService.getTotalPaidForInvoice(invoiceId);

        if (totalPaid > 0) {
            throw new IllegalArgumentException(
                    "Cannot delete an invoice that has payments");
        }

        invoiceRepository.delete(invoiceId);
    }
}