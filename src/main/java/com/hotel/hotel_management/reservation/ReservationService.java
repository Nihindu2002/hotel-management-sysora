package com.hotel.hotel_management.reservation;

import com.hotel.hotel_management.exception.ConflictException;
import com.hotel.hotel_management.exception.ResourceNotFoundException;
import com.hotel.hotel_management.housekeeping.CreateHousekeepingTaskRequest;
import com.hotel.hotel_management.housekeeping.HousekeepingService;
import com.hotel.hotel_management.housekeeping.HousekeepingTask;
import com.hotel.hotel_management.housekeeping.HousekeepingTaskPriority;
import com.hotel.hotel_management.housekeeping.HousekeepingTaskStatus;
import com.hotel.hotel_management.housekeeping.HousekeepingTaskType;
import com.hotel.hotel_management.invoice.Invoice;
import com.hotel.hotel_management.invoice.InvoiceService;
import com.hotel.hotel_management.notification.NotificationService;
import com.hotel.hotel_management.notification.NotificationType;
import com.hotel.hotel_management.room.Room;
import com.hotel.hotel_management.room.RoomRepository;
import com.hotel.hotel_management.room.RoomStatus;
import com.hotel.hotel_management.user.Role;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;

/**
 * The front-desk reservation lifecycle.
 *
 * <pre>
 *   create  → CONFIRMED   (room becomes RESERVED, invoice opened)
 *   check-in → CHECKED_IN  (room becomes OCCUPIED)
 *   checkout → CHECKED_OUT (bill settled, room becomes CLEANING,
 *                           checkout-cleaning task raised)
 * </pre>
 *
 * Bookings are taken by staff. There is no customer-facing path into any of
 * this, and every state transition is validated here rather than trusted from
 * the client.
 */
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

    // ── Creation ──

    /**
     * Takes a booking at the desk.
     *
     * The reservation is CONFIRMED immediately — there is no approval step and
     * no customer account behind it. The occupant's details are recorded on the
     * reservation itself.
     *
     * @param createdBy Firebase uid of the staff member taking the booking
     */
    public Reservation createReservation(
            CreateReservationRequest request,
            String createdBy) {

        validateDates(request.checkInDate(), request.checkOutDate());

        if (request.numberOfGuests() == null || request.numberOfGuests() < 1) {
            throw new IllegalArgumentException(
                    "Number of guests must be at least 1");
        }

        Room room = roomRepository.findById(request.roomId())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Room not found"));

        if (room.getStatus() == RoomStatus.MAINTENANCE) {
            throw new ConflictException(
                    "Room is under maintenance and cannot be reserved");
        }

        if (room.getStatus() == RoomStatus.CLEANING) {
            throw new ConflictException(
                    "Room is being cleaned and cannot be reserved until housekeeping is completed");
        }

        int maxCapacity = getMaxGuestsForRoom(room);
        if (request.numberOfGuests() > maxCapacity) {
            throw new IllegalArgumentException(
                    "Room is not suitable for " + request.numberOfGuests()
                            + " guests (max capacity: " + maxCapacity + ")");
        }

        if (!isRoomAvailable(request.roomId(), request.checkInDate(), request.checkOutDate())) {
            throw new ConflictException(
                    "Room is already reserved for the selected dates");
        }

        Reservation reservation = new Reservation();

        reservation.setReservationId(UUID.randomUUID().toString());
        reservation.setRoomId(room.getRoomId());
        reservation.setCustomerName(request.customerName().trim());
        reservation.setCustomerPhone(request.customerPhone().trim());
        reservation.setCustomerEmail(
                request.customerEmail() != null && !request.customerEmail().isBlank()
                        ? request.customerEmail().trim()
                        : null);
        reservation.setCreatedBy(createdBy);
        reservation.setCheckInDate(request.checkInDate());
        reservation.setCheckOutDate(request.checkOutDate());
        reservation.setNumberOfGuests(request.numberOfGuests());
        reservation.setStatus(ReservationStatus.CONFIRMED);

        Reservation saved = reservationRepository.save(reservation);

        markRoomReserved(room);

        // Open the bill now so the reservation always has one to settle; the
        // desk reprices it at checkout once charges and discounts are known.
        if (invoiceService != null) {
            try {
                invoiceService.ensureInvoice(saved);
            } catch (IllegalArgumentException exception) {
                // An invoice problem must not lose the booking.
            }
        }

        notifyDesk(
                "Reservation confirmed",
                "Room " + room.getRoomNumber() + " booked for " + saved.getCustomerName()
                        + " (" + saved.getCheckInDate() + " → " + saved.getCheckOutDate() + ").",
                saved.getReservationId());

        return saved;
    }

    public List<Reservation> getAllReservations() {
        return reservationRepository.findAll();
    }

    public Reservation getReservationById(String reservationId) {
        return reservationRepository.findById(reservationId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Reservation not found"));
    }

    // ── Cancellation ──

    public Reservation cancelReservationByStaff(String reservationId) {

        Reservation reservation = getReservationById(reservationId);

        if (reservation.getStatus() == ReservationStatus.CANCELLED) {
            throw new IllegalArgumentException("Reservation is already cancelled");
        }

        if (reservation.getStatus() == ReservationStatus.CHECKED_IN
                || reservation.getStatus() == ReservationStatus.CHECKED_OUT) {
            throw new IllegalArgumentException("This reservation cannot be cancelled");
        }

        ReservationStatus previousStatus = reservation.getStatus();

        Reservation updatedReservation = reservationRepository.updateStatus(
                reservationId, ReservationStatus.CANCELLED);

        updateRoomStatusAfterCancellation(
                reservation.getRoomId(), reservationId, previousStatus);

        return updatedReservation;
    }

    /**
     * Confirms a reservation still sitting in PENDING.
     *
     * New bookings are created CONFIRMED, so this exists only for reservations
     * taken before staff-booked stays became the norm.
     */
    public Reservation confirmReservation(String reservationId) {

        Reservation reservation = getReservationById(reservationId);

        if (reservation.getStatus() != ReservationStatus.PENDING) {
            throw new IllegalArgumentException(
                    "Only pending reservations can be confirmed");
        }

        Room room = roomRepository.findById(reservation.getRoomId())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Room not found"));

        if (room.getStatus() == RoomStatus.MAINTENANCE) {
            throw new ConflictException("Room is not available for confirmation");
        }

        // Re-check overlap so two desks confirming at once cannot both win.
        for (Reservation existing : reservationRepository.findByRoomId(reservation.getRoomId())) {

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
                reservationId, ReservationStatus.CONFIRMED);

        markRoomReserved(room);

        if (invoiceService != null) {
            try {
                invoiceService.ensureInvoice(updatedReservation);
            } catch (IllegalArgumentException exception) {
                // An existing invoice is not a failure to confirm.
            }
        }

        return updatedReservation;
    }

    // ── Check-in ──

    public Reservation checkInReservation(String reservationId) {

        Reservation reservation = getReservationById(reservationId);

        if (reservation.getStatus() == ReservationStatus.CHECKED_IN) {
            throw new IllegalArgumentException(
                    "This reservation has already been checked in");
        }

        if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
            throw new IllegalArgumentException(
                    "Only confirmed reservations can be checked in");
        }

        Room room = roomRepository.findById(reservation.getRoomId())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Room not found"));

        if (room.getStatus() == RoomStatus.MAINTENANCE) {
            throw new ConflictException(
                    "Room is under maintenance and cannot be checked in");
        }

        if (room.getStatus() == RoomStatus.CLEANING) {
            throw new ConflictException(
                    "Room is currently being cleaned and cannot be checked in until housekeeping is completed");
        }

        if (room.getStatus() == RoomStatus.OCCUPIED) {
            throw new ConflictException(
                    "Room is already occupied");
        }

        if (housekeepingService != null && hasActiveCleaning(reservation.getRoomId())) {
            throw new ConflictException(
                    "Room is currently being cleaned and cannot be checked in until housekeeping is completed");
        }

        if (room.getStatus() != RoomStatus.RESERVED
                && room.getStatus() != RoomStatus.AVAILABLE) {
            throw new IllegalArgumentException(
                    "Room must be in RESERVED or AVAILABLE status to check in");
        }

        Reservation updatedReservation = reservationRepository.updateStatus(
                reservationId, ReservationStatus.CHECKED_IN);

        roomRepository.updateStatus(reservation.getRoomId(), RoomStatus.OCCUPIED);

        return updatedReservation;
    }

    // ── Billing & checkout ──

    /**
     * Prices and stores the final bill for a checked-in stay. Called every time
     * the desk changes a charge or discount, so the figure on screen always
     * comes from the backend rather than from local arithmetic.
     */
    public Invoice generateFinalBill(String reservationId, CheckoutBillRequest request) {

        Reservation reservation = getReservationById(reservationId);

        assertCheckedIn(reservation);

        if (invoiceService == null) {
            throw new IllegalStateException("Billing is not available");
        }

        return invoiceService.applyBill(
                reservation,
                request != null ? request.additionalCharges() : List.of(),
                request != null ? request.discountType() : null,
                request != null ? request.discountValue() : null);
    }

    /** The stay's current bill, or {@code null} if it has none yet. */
    public Invoice getBill(String reservationId) {

        getReservationById(reservationId);

        return invoiceService != null
                ? invoiceService.getInvoiceByReservationId(reservationId)
                : null;
    }

    /**
     * Completes checkout.
     *
     * The bill must already exist (it is opened when the booking is taken and
     * repriced at checkout). Payment is recorded separately against the invoice;
     * a stay may be checked out with a balance still owing, which the invoice
     * keeps tracking.
     */
    public CheckoutResponse checkOutReservation(String reservationId) {

        Reservation reservation = getReservationById(reservationId);

        assertCheckedIn(reservation);

        Invoice invoice = invoiceService != null
                ? invoiceService.getInvoiceByReservationId(reservationId)
                : null;

        if (invoice == null) {
            throw new IllegalArgumentException(
                    "Generate the final bill before checking out");
        }

        Reservation updatedReservation = reservationRepository.updateStatus(
                reservationId, ReservationStatus.CHECKED_OUT);

        roomRepository.updateStatus(reservation.getRoomId(), RoomStatus.CLEANING);

        raiseCheckoutCleaningTask(reservation);

        return new CheckoutResponse(updatedReservation, invoice);
    }

    // ── Availability ──

    public boolean isRoomAvailable(
            String roomId,
            LocalDate checkInDate,
            LocalDate checkOutDate) {

        validateDates(checkInDate, checkOutDate);

        Room room = roomRepository.findById(roomId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Room not found"));

        if (isRoomUnavailableByStatus(room, checkInDate)) {
            return false;
        }

        for (Reservation existing : reservationRepository.findByRoomId(roomId)) {
            if (!holdsRoom(existing)) {
                continue;
            }
            if (overlaps(checkInDate, checkOutDate, existing)) {
                return false;
            }
        }

        return true;
    }

    public List<Room> getAvailableRooms(
            LocalDate checkInDate,
            LocalDate checkOutDate,
            Integer numberOfGuests) {

        validateDates(checkInDate, checkOutDate);

        List<Room> allRooms = roomRepository.findAll();
        if (allRooms == null || allRooms.isEmpty()) {
            return List.of();
        }

        List<Reservation> allReservations = reservationRepository.findAll();

        java.util.Map<String, List<Reservation>> reservationsByRoom =
                (allReservations != null ? allReservations : List.<Reservation>of()).stream()
                        .filter(this::holdsRoom)
                        .filter(r -> r.getRoomId() != null)
                        .collect(java.util.stream.Collectors.groupingBy(Reservation::getRoomId));

        return allRooms.stream()
                .filter(room -> !isRoomUnavailableByStatus(room, checkInDate))
                .filter(room -> reservationsByRoom
                        .getOrDefault(room.getRoomId(), List.of())
                        .stream()
                        .noneMatch(existing -> overlaps(checkInDate, checkOutDate, existing)))
                .filter(room -> numberOfGuests == null
                        || numberOfGuests <= getMaxGuestsForRoom(room))
                .toList();
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

    // ── Internals ──

    private void assertCheckedIn(Reservation reservation) {
        if (reservation.getStatus() != ReservationStatus.CHECKED_IN) {
            throw new IllegalArgumentException(
                    "Only checked-in reservations can be checked out");
        }
    }

    private void validateDates(LocalDate checkInDate, LocalDate checkOutDate) {

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
    }

    /** A room is unusable today if it is being worked on or already occupied. */
    private boolean isRoomUnavailableByStatus(Room room, LocalDate checkInDate) {
        return room.getStatus() == RoomStatus.MAINTENANCE
                || room.getStatus() == RoomStatus.OCCUPIED
                || (room.getStatus() == RoomStatus.CLEANING
                        && checkInDate.equals(LocalDate.now()));
    }

    /** Statuses that hold a room against the dates they cover. */
    private boolean holdsRoom(Reservation reservation) {
        return EnumSet.of(
                        ReservationStatus.CONFIRMED,
                        ReservationStatus.CHECKED_IN,
                        ReservationStatus.PENDING)
                .contains(reservation.getStatus());
    }

    private boolean overlaps(
            LocalDate checkInDate,
            LocalDate checkOutDate,
            Reservation existing) {

        if (existing.getCheckInDate() == null || existing.getCheckOutDate() == null) {
            return false;
        }

        return checkInDate.isBefore(existing.getCheckOutDate())
                && checkOutDate.isAfter(existing.getCheckInDate());
    }

    private boolean hasActiveCleaning(String roomId) {
        List<HousekeepingTask> tasks = housekeepingService.getTasksByRoomId(roomId);
        return tasks != null && tasks.stream().anyMatch(task ->
                task.getStatus() == HousekeepingTaskStatus.PENDING
                        || task.getStatus() == HousekeepingTaskStatus.ASSIGNED
                        || task.getStatus() == HousekeepingTaskStatus.IN_PROGRESS);
    }

    private void markRoomReserved(Room room) {
        if (room.getStatus() != RoomStatus.CLEANING) {
            roomRepository.updateStatus(room.getRoomId(), RoomStatus.RESERVED);
        }
    }

    /**
     * Raises the checkout-cleaning task, unless the room already has one
     * outstanding. Checkout itself can only happen once per stay, but a retried
     * request must not queue a second cleaning.
     */
    private void raiseCheckoutCleaningTask(Reservation reservation) {

        if (housekeepingService == null) {
            return;
        }

        List<HousekeepingTask> existingTasks =
                housekeepingService.getTasksByRoomId(reservation.getRoomId());

        boolean hasOutstandingTask = existingTasks != null && existingTasks.stream()
                .anyMatch(task -> task.getStatus() != HousekeepingTaskStatus.COMPLETED
                        && task.getStatus() != HousekeepingTaskStatus.CANCELLED);

        if (hasOutstandingTask) {
            return;
        }

        try {
            housekeepingService.createTask(
                    new CreateHousekeepingTaskRequest(
                            reservation.getRoomId(),
                            HousekeepingTaskType.CHECKOUT_CLEANING,
                            HousekeepingTaskPriority.HIGH,
                            "Checkout cleaning for reservation "
                                    + reservation.getReservationId()
                                    + " (room " + reservation.getRoomId() + ")"));
        } catch (IllegalArgumentException exception) {
            // The task already exists; checkout still stands.
        }
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

    /** Bookings are an operational event; the front desk needs to see them. */
    private void notifyDesk(String title, String message, String referenceId) {

        if (notificationService == null) {
            return;
        }

        notificationService.emitToRoles(
                EnumSet.of(Role.ADMIN, Role.MANAGER, Role.RECEPTIONIST),
                NotificationType.RESERVATION,
                title,
                message,
                "/reservations",
                referenceId);
    }
}
