package com.hotel.hotel_management.reservation;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ExecutionException;

import com.google.cloud.firestore.DocumentReference;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutionException;

@Repository
public class ReservationRepository {

    private final Firestore firestore;

    public ReservationRepository(Firestore firestore) {
        this.firestore = firestore;
    }

    public Reservation save(Reservation reservation) {

        Instant now = Instant.now();

        if (reservation.getCreatedAt() == null) {
            reservation.setCreatedAt(now);
        }

        reservation.setUpdatedAt(now);

        Map<String, Object> data = new HashMap<>();

        data.put("reservationId", reservation.getReservationId());
        data.put("customerUid", reservation.getCustomerUid());
        data.put("roomId", reservation.getRoomId());
        data.put("checkInDate",
                reservation.getCheckInDate().toString());
        data.put("checkOutDate",
                reservation.getCheckOutDate().toString());
        data.put("numberOfGuests",
                reservation.getNumberOfGuests());
        data.put("status",
                reservation.getStatus().name());
        data.put("createdAt",
                Date.from(reservation.getCreatedAt()));
        data.put("updatedAt",
                Date.from(reservation.getUpdatedAt()));

        try {
            firestore.collection("reservations")
                    .document(reservation.getReservationId())
                    .set(data)
                    .get();

            return reservation;

        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(
                    "Unable to save reservation", exception);

        } catch (ExecutionException exception) {
            throw new IllegalStateException(
                    "Unable to save reservation", exception);
        }
    }

    public Optional<Reservation> findById(String reservationId) {

        try {
            DocumentSnapshot document = firestore
                    .collection("reservations")
                    .document(reservationId)
                    .get()
                    .get();

            return document.exists()
                    ? Optional.of(toReservation(document))
                    : Optional.empty();

        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(
                    "Unable to read reservation", exception);

        } catch (ExecutionException exception) {
            throw new IllegalStateException(
                    "Unable to read reservation", exception);
        }
    }

    public List<Reservation> findAll() {

        try {
            return firestore.collection("reservations")
                    .get()
                    .get()
                    .getDocuments()
                    .stream()
                    .map(this::toReservation)
                    .toList();

        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(
                    "Unable to read reservations", exception);

        } catch (ExecutionException exception) {
            throw new IllegalStateException(
                    "Unable to read reservations", exception);
        }
    }

    public List<Reservation> findByRoomId(String roomId) {

        try {
            return firestore.collection("reservations")
                    .whereEqualTo("roomId", roomId)
                    .get()
                    .get()
                    .getDocuments()
                    .stream()
                    .map(this::toReservation)
                    .toList();

        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(
                    "Unable to read room reservations", exception);

        } catch (ExecutionException exception) {
            throw new IllegalStateException(
                    "Unable to read room reservations", exception);
        }
    }

    public List<Reservation> findByCustomerUid(String customerUid) {

        try {
            return firestore.collection("reservations")
                    .whereEqualTo("customerUid", customerUid)
                    .get()
                    .get()
                    .getDocuments()
                    .stream()
                    .map(this::toReservation)
                    .toList();

        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(
                    "Unable to read customer reservations", exception);

        } catch (ExecutionException exception) {
            throw new IllegalStateException(
                    "Unable to read customer reservations", exception);
        }
    }

    private Reservation toReservation(DocumentSnapshot document) {

        Reservation reservation = new Reservation();

        reservation.setReservationId(document.getId());
        reservation.setCustomerUid(
                document.getString("customerUid"));
        reservation.setRoomId(
                document.getString("roomId"));

        String checkInDate =
                document.getString("checkInDate");

        if (checkInDate != null) {
            reservation.setCheckInDate(
                    LocalDate.parse(checkInDate));
        }

        String checkOutDate =
                document.getString("checkOutDate");

        if (checkOutDate != null) {
            reservation.setCheckOutDate(
                    LocalDate.parse(checkOutDate));
        }

        Long guests =
                document.getLong("numberOfGuests");

        if (guests != null) {
            reservation.setNumberOfGuests(
                    guests.intValue());
        }

        String status =
                document.getString("status");

        if (status != null) {
            reservation.setStatus(
                    ReservationStatus.valueOf(status));
        }

        reservation.setCreatedAt(
                toInstant(document.getDate("createdAt")));

        reservation.setUpdatedAt(
                toInstant(document.getDate("updatedAt")));

        return reservation;
    }

    private Instant toInstant(Date value) {
        return value == null ? null : value.toInstant();
    }

    public Reservation updateStatus(
        String reservationId,
        ReservationStatus status) {

    DocumentReference document =
            firestore.collection("reservations")
                    .document(reservationId);

    Map<String, Object> updates = new HashMap<>();
    updates.put("status", status.name());
    updates.put("updatedAt", Instant.now());

    try {
        document.update(updates).get();

        return findById(reservationId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Reservation not found"));

    } catch (InterruptedException exception) {
        Thread.currentThread().interrupt();
        throw new IllegalStateException(
                "Unable to update reservation status",
                exception);

    } catch (ExecutionException exception) {
        throw new IllegalStateException(
                "Unable to update reservation status",
                exception);
    }
}
}