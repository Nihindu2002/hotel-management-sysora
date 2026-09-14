package com.hotel.hotel_management.invoice;

import com.hotel.hotel_management.reservation.Reservation;
import com.hotel.hotel_management.reservation.ReservationRepository;
import com.hotel.hotel_management.room.Room;
import com.hotel.hotel_management.room.RoomRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final ReservationRepository reservationRepository;
    private final RoomRepository roomRepository;

    public InvoiceService(
            InvoiceRepository invoiceRepository,
            ReservationRepository reservationRepository,
            RoomRepository roomRepository) {

        this.invoiceRepository = invoiceRepository;
        this.reservationRepository = reservationRepository;
        this.roomRepository = roomRepository;
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

        return invoiceRepository.findById(invoiceId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Invoice not found"));
    }

    public java.util.List<Invoice> getMyInvoices(
        String customerUid) {

    return invoiceRepository.findByCustomerUid(customerUid);
}
}