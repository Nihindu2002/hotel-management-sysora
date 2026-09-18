package com.hotel.hotel_management.reservation;

import com.hotel.hotel_management.common.ForbiddenException;
import com.hotel.hotel_management.exception.ConflictException;
import com.hotel.hotel_management.exception.ResourceNotFoundException;
import com.hotel.hotel_management.housekeeping.CreateHousekeepingTaskRequest;
import com.hotel.hotel_management.housekeeping.HousekeepingService;
import com.hotel.hotel_management.housekeeping.HousekeepingTask;
import com.hotel.hotel_management.housekeeping.HousekeepingTaskPriority;
import com.hotel.hotel_management.housekeeping.HousekeepingTaskStatus;
import com.hotel.hotel_management.housekeeping.HousekeepingTaskType;
import com.hotel.hotel_management.invoice.InvoiceService;
import com.hotel.hotel_management.notification.NotificationService;
import com.hotel.hotel_management.notification.NotificationType;
import com.hotel.hotel_management.room.Room;
import com.hotel.hotel_management.room.RoomRepository;
import com.hotel.hotel_management.room.RoomStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final RoomRepository roomRepository;
    private final HousekeepingService housekeepingService;
    private final InvoiceService invoiceService;
    private final NotificationService notificationService;

    @Autowired
    public ReservationService(
            ReservationRepository reservationRepository,
            RoomRepository roomRepository,
            HousekeepingService housekeepingService,
            @Lazy InvoiceService invoiceService,
            NotificationService notificationService) {

        this.reservationRepository = reservationRepository;
        this.roomRepository = roomRepository;
        this.housekeepingService = housekeepingService;
        this.invoiceService = invoiceService;
        this.notificationService = notificationService;
    }

    public ReservationService(
            ReservationRepository reservationRepository,
            RoomRepository roomRepository,
            HousekeepingService housekeepingService) {

        this(reservationRepository, roomRepository, housekeepingService, null, null);
    }

    /** Test/alternate wiring without notifications. */
    public ReservationService(
            ReservationRepository reservationRepository,
            RoomRepository roomRepository,
            HousekeepingService housekeepingService,
            InvoiceService invoiceService) {

        this(reservationRepository, roomRepository, housekeepingService, invoiceService, null);
    }

    public Reservation createReservation(
            String customerUid,
            CreateReservationRequest request) {

        if (request.checkInDate() == null || request.checkOutDate() == null) {
            throw new IllegalArgumentException(
                    "Check-in and check-out dates are required");
        }

        if (request.checkInDate().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException(
                    "Check-in date cannot be in the past");
        }

        if (!request.checkOutDate().isAfter(request.checkInDate())) {
            throw new IllegalArgumentException(
                    "Check-out date must be after check-in date");
        }

        if (request.numberOfGuests() == null || request.numberOfGuests() < 1) {
            throw new IllegalArgumentException(
                    "Number of guests must be at least 1");
        }

        Room room = roomRepository.findById(request.roomId())
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Room not found"));

        if (room.getStatus() == RoomStatus.MAINTENANCE
                || (room.getStatus() == RoomStatus.CLEANING && request.checkInDate().equals(LocalDate.now()))) {
            throw new ConflictException(
                    "Room is not available for reservation");
        }

        int maxCapacity = getMaxGuestsForRoom(room);
        if (request.numberOfGuests() > maxCapacity) {
            throw new IllegalArgumentException(
                    "Room is not suitable for " + request.numberOfGuests() + " guests (max capacity: " + maxCapacity + ")");
        }

        if (!isRoomAvailable(
                request.roomId(),
                request.checkInDate(),
                request.checkOutDate())) {

            throw new ConflictException(
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
                        new ResourceNotFoundException(
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
                        new ResourceNotFoundException("Reservation not found"));

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

        ReservationStatus previousStatus = reservation.getStatus();

        Reservation updatedReservation = reservationRepository.updateStatus(
                reservationId,
                ReservationStatus.CANCELLED);

        updateRoomStatusAfterCancellation(reservation.getRoomId(), reservationId, previousStatus);

        return updatedReservation;
    }

    public Reservation cancelReservationByStaff(
            String reservationId) {

        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Reservation not found"));

        if (reservation.getStatus() == ReservationStatus.CANCELLED) {
            throw new IllegalArgumentException(
                    "Reservation is already cancelled");
        }

        if (reservation.getStatus() == ReservationStatus.CHECKED_IN
                || reservation.getStatus() == ReservationStatus.CHECKED_OUT) {
            throw new IllegalArgumentException(
                    "This reservation cannot be cancelled");
        }

        ReservationStatus previousStatus = reservation.getStatus();

        Reservation updatedReservation = reservationRepository.updateStatus(
                reservationId,
                ReservationStatus.CANCELLED);

        updateRoomStatusAfterCancellation(reservation.getRoomId(), reservationId, previousStatus);

        return updatedReservation;
    }

    public Reservation confirmReservation(
            String reservationId) {

        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Reservation not found"));

        if (reservation.getStatus() != ReservationStatus.PENDING) {
            throw new IllegalArgumentException(
                    "Only pending reservations can be confirmed");
        }

        Room room = roomRepository.findById(reservation.getRoomId())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Room not found"));

        if (room.getStatus() == RoomStatus.MAINTENANCE) {
            throw new ConflictException(
                    "Room is not available for confirmation");
        }

        // Concurrency protection: re-check date overlap against other active/confirmed reservations
        List<Reservation> reservations =
                reservationRepository.findByRoomId(reservation.getRoomId());

        for (Reservation existing : reservations) {
            if (existing.getReservationId().equals(reservationId)) {
                continue;
            }

            if (existing.getStatus() != ReservationStatus.CONFIRMED
                    && existing.getStatus() != ReservationStatus.CHECKED_IN) {
                continue;
            }

            boolean overlaps =
                    reservation.getCheckInDate().isBefore(existing.getCheckOutDate())
                    && reservation.getCheckOutDate().isAfter(existing.getCheckInDate());

            if (overlaps) {
                throw new ConflictException(
                        "Room is already reserved for the selected dates");
            }
        }

        Reservation updatedReservation = reservationRepository.updateStatus(
                reservationId,
                ReservationStatus.CONFIRMED);

        if (room.getStatus() != RoomStatus.CLEANING) {
            roomRepository.updateStatus(
                    reservation.getRoomId(),
                    RoomStatus.RESERVED);
        }

        if (invoiceService != null) {
            try {
                invoiceService.createInvoice(reservationId);
            } catch (IllegalArgumentException e) {
                // If invoice already exists, do not fail confirmation
            }
        }

        if (notificationService != null) {
            notificationService.emit(
                    updatedReservation.getCustomerUid(),
                    NotificationType.RESERVATION,
                    "Reservation confirmed",
                    "Your reservation for room " + updatedReservation.getRoomId() + " from "
                            + updatedReservation.getCheckInDate() + " to "
                            + updatedReservation.getCheckOutDate() + " is confirmed.",
                    "/my-reservations",
                    updatedReservation.getReservationId());
        }

        return updatedReservation;
    }

    public Reservation checkInReservation(
            String reservationId) {

        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Reservation not found"));

        if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
            throw new IllegalArgumentException(
                    "Only confirmed reservations can be checked in");
        }

        Room room = roomRepository.findById(reservation.getRoomId())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Room not found"));

        if (room.getStatus() == RoomStatus.CLEANING) {
            throw new ConflictException(
                    "Room is currently being cleaned and cannot be checked in until housekeeping is completed");
        }

        if (room.getStatus() == RoomStatus.MAINTENANCE) {
            throw new ConflictException(
                    "Room is under maintenance and cannot be checked in");
        }

        if (housekeepingService != null) {
            List<HousekeepingTask> tasks = housekeepingService.getTasksByRoomId(reservation.getRoomId());
            boolean hasActiveCleaning = tasks != null && tasks.stream()
                    .anyMatch(task -> (task.getStatus() == HousekeepingTaskStatus.PENDING
                            || task.getStatus() == HousekeepingTaskStatus.ASSIGNED
                            || task.getStatus() == HousekeepingTaskStatus.IN_PROGRESS));
            if (hasActiveCleaning) {
                throw new ConflictException(
                        "Room is currently being cleaned and cannot be checked in until housekeeping is completed");
            }
        }

        if (room.getStatus() != RoomStatus.RESERVED && room.getStatus() != RoomStatus.AVAILABLE) {
            throw new IllegalArgumentException(
                    "Room must be in RESERVED or AVAILABLE status to check in");
        }

        Reservation updatedReservation = reservationRepository.updateStatus(
                reservationId,
                ReservationStatus.CHECKED_IN);

        roomRepository.updateStatus(
                reservation.getRoomId(),
                RoomStatus.OCCUPIED);

        return updatedReservation;
    }

    public Reservation checkOutReservation(
            String reservationId) {

        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Reservation not found"));

        if (reservation.getStatus() != ReservationStatus.CHECKED_IN) {
            throw new IllegalArgumentException(
                    "Only checked-in reservations can be checked out");
        }

        Reservation updatedReservation = reservationRepository.updateStatus(
                reservationId,
                ReservationStatus.CHECKED_OUT);

        roomRepository.updateStatus(
                reservation.getRoomId(),
                RoomStatus.CLEANING);

        // Prevent duplicate checkout-cleaning tasks or errors if an active housekeeping task already exists
        List<HousekeepingTask> existingTasks =
                housekeepingService.getTasksByRoomId(reservation.getRoomId());

        boolean hasActiveTask = existingTasks != null && existingTasks.stream()
                .anyMatch(task -> (task.getTaskType() == HousekeepingTaskType.CHECKOUT_CLEANING
                                || task.getStatus() == HousekeepingTaskStatus.PENDING
                                || task.getStatus() == HousekeepingTaskStatus.ASSIGNED
                                || task.getStatus() == HousekeepingTaskStatus.IN_PROGRESS)
                        && task.getStatus() != HousekeepingTaskStatus.COMPLETED
                        && task.getStatus() != HousekeepingTaskStatus.CANCELLED);

        if (!hasActiveTask) {
            try {
                housekeepingService.createTask(
                        new CreateHousekeepingTaskRequest(
                                reservation.getRoomId(),
                                HousekeepingTaskType.CHECKOUT_CLEANING,
                                HousekeepingTaskPriority.HIGH,
                                "Checkout cleaning for reservation " + reservationId));
            } catch (IllegalArgumentException e) {
                // If task already exists, do not fail check-out
            }
        }

        return updatedReservation;
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

        Room room = roomRepository.findById(roomId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Room not found"));

        if (room.getStatus() == RoomStatus.MAINTENANCE
                || room.getStatus() == RoomStatus.OCCUPIED
                || (room.getStatus() == RoomStatus.CLEANING && checkInDate.equals(LocalDate.now()))) {
            return false;
        }

        List<Reservation> reservations =
                reservationRepository.findByRoomId(roomId);

        for (Reservation existing : reservations) {

            if (existing.getStatus() != ReservationStatus.CONFIRMED
                    && existing.getStatus() != ReservationStatus.CHECKED_IN
                    && existing.getStatus() != ReservationStatus.PENDING) {
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

    public List<Room> getAvailableRooms(
            LocalDate checkInDate,
            LocalDate checkOutDate,
            Integer numberOfGuests) {

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

        List<Room> allRooms = roomRepository.findAll();
        if (allRooms == null || allRooms.isEmpty()) {
            return List.of();
        }

        List<Reservation> allReservations = reservationRepository.findAll();
        java.util.Map<String, List<Reservation>> reservationsByRoom =
                (allReservations != null ? allReservations : List.<Reservation>of()).stream()
                        .filter(r -> r.getStatus() == ReservationStatus.CONFIRMED
                                || r.getStatus() == ReservationStatus.CHECKED_IN
                                || r.getStatus() == ReservationStatus.PENDING)
                        .filter(r -> r.getRoomId() != null)
                        .collect(java.util.stream.Collectors.groupingBy(Reservation::getRoomId));

        return allRooms.stream()
                .filter(room -> isRoomAvailableInMemory(room, checkInDate, checkOutDate, reservationsByRoom.getOrDefault(room.getRoomId(), List.of())))
                .filter(room -> numberOfGuests == null || numberOfGuests <= getMaxGuestsForRoom(room))
                .toList();
    }

    private boolean isRoomAvailableInMemory(
            Room room,
            LocalDate checkInDate,
            LocalDate checkOutDate,
            List<Reservation> activeReservations) {

        if (room.getStatus() == RoomStatus.MAINTENANCE
                || room.getStatus() == RoomStatus.OCCUPIED
                || (room.getStatus() == RoomStatus.CLEANING && checkInDate.equals(LocalDate.now()))) {
            return false;
        }

        for (Reservation existing : activeReservations) {
            boolean overlaps =
                    checkInDate.isBefore(existing.getCheckOutDate())
                    && checkOutDate.isAfter(existing.getCheckInDate());

            if (overlaps) {
                return false;
            }
        }

        return true;
    }

    public static int getMaxGuestsForRoom(Room room) {
        if (room == null || room.getRoomType() == null) {
            return 4;
        }
        return switch (room.getRoomType()) {
            case STANDARD -> 2;
            case DELUXE -> 3;
            case SUITE -> 4;
            case FAMILY -> 6;
        };
    }

    private void updateRoomStatusAfterCancellation(
            String roomId,
            String cancelledReservationId,
            ReservationStatus previousStatus) {

        if (previousStatus != ReservationStatus.CONFIRMED) {
            return;
        }

        Room room = roomRepository.findById(roomId).orElse(null);
        if (room == null || room.getStatus() != RoomStatus.RESERVED) {
            return;
        }

        boolean hasOtherConfirmed = reservationRepository.findByRoomId(roomId).stream()
                .filter(r -> !r.getReservationId().equals(cancelledReservationId))
                .anyMatch(r -> r.getStatus() == ReservationStatus.CONFIRMED);

        if (!hasOtherConfirmed) {
            roomRepository.updateStatus(roomId, RoomStatus.AVAILABLE);
        }
    }
}