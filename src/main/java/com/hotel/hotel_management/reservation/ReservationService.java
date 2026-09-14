package com.hotel.hotel_management.reservation;

import com.hotel.hotel_management.common.ForbiddenException;
import com.hotel.hotel_management.room.Room;
import com.hotel.hotel_management.room.RoomRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final RoomRepository roomRepository;

    public ReservationService(
            ReservationRepository reservationRepository,
            RoomRepository roomRepository) {

        this.reservationRepository = reservationRepository;
        this.roomRepository = roomRepository;
    }

    public Reservation createReservation(
            String customerUid,
            CreateReservationRequest request) {

        if (request.checkOutDate()
                .isBefore(request.checkInDate())
                || request.checkOutDate()
                .isEqual(request.checkInDate())) {

            throw new IllegalArgumentException(
                    "Check-out date must be after check-in date");
        }

        Room room = roomRepository.findById(request.roomId())
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Room not found"));

        if (!isRoomAvailable(
                request.roomId(),
                request.checkInDate(),
                request.checkOutDate())) {

            throw new IllegalArgumentException(
                    "Room is already reserved for the selected dates");
        }

        Reservation reservation = new Reservation();

        reservation.setReservationId(
                UUID.randomUUID().toString());

        reservation.setCustomerUid(customerUid);
        reservation.setRoomId(room.getRoomId());
        reservation.setCheckInDate(request.checkInDate());
        reservation.setCheckOutDate(request.checkOutDate());
        reservation.setNumberOfGuests(request.numberOfGuests());
        reservation.setStatus(ReservationStatus.PENDING);

        return reservationRepository.save(reservation);
    }

    public List<Reservation> getAllReservations() {
        return reservationRepository.findAll();
    }

    public List<Reservation> getCustomerReservations(String customerUid) {
        return reservationRepository.findByCustomerUid(customerUid);
    }

    public Reservation getReservationById(
            String reservationId,
            String customerUid) {

        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Reservation not found"));

        if (!reservation.getCustomerUid().equals(customerUid)) {
            throw new ForbiddenException(
                    "You are not authorized to view this reservation");
        }

        return reservation;
    }

    public Reservation cancelReservation(
        String reservationId,
        String customerUid) {

    Reservation reservation = reservationRepository.findById(reservationId)
            .orElseThrow(() ->
                    new IllegalArgumentException("Reservation not found"));

    if (!reservation.getCustomerUid().equals(customerUid)) {
        throw new ForbiddenException(
                "You are not authorized to cancel this reservation");
    }

    if (reservation.getStatus() == ReservationStatus.CANCELLED) {
        throw new IllegalArgumentException(
                "Reservation is already cancelled");
    }

    if (reservation.getStatus() == ReservationStatus.CHECKED_IN
            || reservation.getStatus() == ReservationStatus.CHECKED_OUT) {
        throw new IllegalArgumentException(
                "This reservation cannot be cancelled");
    }

    return reservationRepository.updateStatus(
            reservationId,
            ReservationStatus.CANCELLED);
}

public Reservation cancelReservationByStaff(
        String reservationId) {

    Reservation reservation = reservationRepository.findById(reservationId)
            .orElseThrow(() ->
                    new IllegalArgumentException("Reservation not found"));

    if (reservation.getStatus() == ReservationStatus.CANCELLED) {
        throw new IllegalArgumentException(
                "Reservation is already cancelled");
    }

    if (reservation.getStatus() == ReservationStatus.CHECKED_IN
            || reservation.getStatus() == ReservationStatus.CHECKED_OUT) {
        throw new IllegalArgumentException(
                "This reservation cannot be cancelled");
    }

    return reservationRepository.updateStatus(
            reservationId,
            ReservationStatus.CANCELLED);
}

public Reservation confirmReservation(
        String reservationId) {

    Reservation reservation = reservationRepository.findById(reservationId)
            .orElseThrow(() ->
                    new IllegalArgumentException("Reservation not found"));

    if (reservation.getStatus() != ReservationStatus.PENDING) {
        throw new IllegalArgumentException(
                "Only pending reservations can be confirmed");
    }

    return reservationRepository.updateStatus(
            reservationId,
            ReservationStatus.CONFIRMED);
}
public Reservation checkInReservation(
        String reservationId) {

    Reservation reservation = reservationRepository.findById(reservationId)
            .orElseThrow(() ->
                    new IllegalArgumentException("Reservation not found"));

    if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
        throw new IllegalArgumentException(
                "Only confirmed reservations can be checked in");
    }

    return reservationRepository.updateStatus(
            reservationId,
            ReservationStatus.CHECKED_IN);
}

public Reservation checkOutReservation(
        String reservationId) {

    Reservation reservation = reservationRepository.findById(reservationId)
            .orElseThrow(() ->
                    new IllegalArgumentException("Reservation not found"));

    if (reservation.getStatus() != ReservationStatus.CHECKED_IN) {
        throw new IllegalArgumentException(
                "Only checked-in reservations can be checked out");
    }

    return reservationRepository.updateStatus(
            reservationId,
            ReservationStatus.CHECKED_OUT);
}
public boolean isRoomAvailable(
        String roomId,
        LocalDate checkInDate,
        LocalDate checkOutDate) {

    if (checkInDate == null || checkOutDate == null) {
        throw new IllegalArgumentException(
                "Check-in and check-out dates are required");
    }

    if (!checkOutDate.isAfter(checkInDate)) {
        throw new IllegalArgumentException(
                "Check-out date must be after check-in date");
    }

    if (checkInDate.isBefore(LocalDate.now())) {
        throw new IllegalArgumentException(
                "Check-in date cannot be in the past");
    }

    if (roomRepository.findById(roomId).isEmpty()) {
        throw new IllegalArgumentException(
                "Room not found");
    }

    List<Reservation> reservations =
            reservationRepository.findByRoomId(roomId);

    for (Reservation existing : reservations) {

        if (existing.getStatus() == ReservationStatus.CANCELLED
                || existing.getStatus() == ReservationStatus.CHECKED_OUT) {
            continue;
        }

        boolean overlaps =
                checkInDate.isBefore(existing.getCheckOutDate())
                && checkOutDate.isAfter(existing.getCheckInDate());

        if (overlaps) {
            return false;
        }
    }

    return true;
}
}