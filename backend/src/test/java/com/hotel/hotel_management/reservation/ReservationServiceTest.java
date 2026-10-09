package com.hotel.hotel_management.reservation;

import com.hotel.hotel_management.housekeeping.CreateHousekeepingTaskRequest;
import com.hotel.hotel_management.housekeeping.HousekeepingService;
import com.hotel.hotel_management.housekeeping.HousekeepingTask;
import com.hotel.hotel_management.housekeeping.HousekeepingTaskStatus;
import com.hotel.hotel_management.housekeeping.HousekeepingTaskType;
import com.hotel.hotel_management.exception.ConflictException;
import com.hotel.hotel_management.invoice.Invoice;
import com.hotel.hotel_management.invoice.InvoiceService;
import com.hotel.hotel_management.room.Room;
import com.hotel.hotel_management.room.RoomRepository;
import com.hotel.hotel_management.room.RoomStatus;
import com.hotel.hotel_management.room.RoomType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class ReservationServiceTest {

    private ReservationRepository reservationRepository;
    private RoomRepository roomRepository;
    private HousekeepingService housekeepingService;
    private InvoiceService invoiceService;
    private ReservationService reservationService;

    private static final String STAFF_UID = "staff-1";

    @BeforeEach
    void setUp() {
        reservationRepository = mock(ReservationRepository.class);
        roomRepository = mock(RoomRepository.class);
        housekeepingService = mock(HousekeepingService.class);
        invoiceService = mock(InvoiceService.class);

        reservationService = new ReservationService(
                reservationRepository,
                roomRepository,
                housekeepingService,
                invoiceService
        );
    }

    // ── Helpers ──

    private Room room(String roomId, RoomStatus status) {
        Room room = new Room();
        room.setRoomId(roomId);
        room.setRoomNumber(roomId.replace("room-", ""));
        room.setRoomType(RoomType.STANDARD);
        room.setPricePerNight(10000.0);
        room.setStatus(status);
        return room;
    }

    private Reservation reservation(String resId, String roomId, ReservationStatus status) {
        Reservation reservation = new Reservation();
        reservation.setReservationId(resId);
        reservation.setRoomId(roomId);
        reservation.setCustomerName("Nimal Perera");
        reservation.setCustomerPhone("0771234567");
        reservation.setStatus(status);
        reservation.setCheckInDate(LocalDate.now().plusDays(1));
        reservation.setCheckOutDate(LocalDate.now().plusDays(3));
        return reservation;
    }

    private CreateReservationRequest request(
            String roomId, LocalDate checkIn, LocalDate checkOut, int guests) {
        return new CreateReservationRequest(
                roomId, "Nimal Perera", "0771234567", null, checkIn, checkOut, guests);
    }

    private CreateReservationRequest request(
            String roomId,
            LocalDate checkIn,
            LocalDate checkOut,
            int guests,
            BoardPackage boardPackage) {
        return new CreateReservationRequest(
                roomId, "Nimal Perera", "0771234567", null,
                checkIn, checkOut, guests, boardPackage);
    }

    // ── Booking ──

    @Test
    void createReservation_ConfirmsImmediatelyAndReservesRoom() {
        String roomId = "room-201";
        Room room = room(roomId, RoomStatus.AVAILABLE);

        LocalDate checkIn = LocalDate.now().plusDays(2);
        LocalDate checkOut = LocalDate.now().plusDays(5);

        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));
        when(reservationRepository.findByRoomId(roomId)).thenReturn(Collections.emptyList());
        when(reservationRepository.save(any(Reservation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Reservation created = reservationService.createReservation(
                request(roomId, checkIn, checkOut, 2), STAFF_UID);

        assertNotNull(created);
        assertEquals(roomId, created.getRoomId());
        assertEquals("Nimal Perera", created.getCustomerName());
        assertEquals("0771234567", created.getCustomerPhone());
        assertEquals(STAFF_UID, created.getCreatedBy());
        assertEquals(checkIn, created.getCheckInDate());
        assertEquals(checkOut, created.getCheckOutDate());
        assertEquals(2, created.getNumberOfGuests());
        assertEquals(BoardPackage.ROOM_ONLY, created.getBoardPackage());
        assertEquals(10000.0, created.getPackagePricePerNight());
        // No approval step: a booking taken at the desk is confirmed on the spot.
        assertEquals(ReservationStatus.CONFIRMED, created.getStatus());
        assertNotNull(created.getReservationId());

        verify(roomRepository).updateStatus(roomId, RoomStatus.RESERVED);
        // The bill is opened up front so there is always one to settle.
        verify(invoiceService).ensureInvoice(created);
    }

    @Test
    void createReservation_SnapshotsSelectedBoardPackagePrice() {
        String roomId = "room-201";
        Room room = room(roomId, RoomStatus.AVAILABLE);
        LocalDate checkIn = LocalDate.now().plusDays(2);
        LocalDate checkOut = LocalDate.now().plusDays(5);

        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));
        when(reservationRepository.findByRoomId(roomId)).thenReturn(Collections.emptyList());
        when(reservationRepository.save(any(Reservation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Reservation created = reservationService.createReservation(
                request(roomId, checkIn, checkOut, 2, BoardPackage.FULL_BOARD),
                STAFF_UID);

        assertEquals(BoardPackage.FULL_BOARD, created.getBoardPackage());
        assertEquals(21000.0, created.getPackagePricePerNight());
    }

    @Test
    void createReservation_RejectsMaintenanceRoom() {
        String roomId = "room-202";
        Room room = room(roomId, RoomStatus.MAINTENANCE);

        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));

        assertThrows(ConflictException.class, () -> reservationService.createReservation(
                request(roomId, LocalDate.now().plusDays(1), LocalDate.now().plusDays(3), 2),
                STAFF_UID));

        verify(reservationRepository, never()).save(any(Reservation.class));
    }

    @Test
    void createReservation_RejectsCleaningRoom() {
        String roomId = "room-202b";
        Room room = room(roomId, RoomStatus.CLEANING);

        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));

        assertThrows(ConflictException.class, () -> reservationService.createReservation(
                request(roomId, LocalDate.now().plusDays(1), LocalDate.now().plusDays(3), 2),
                STAFF_UID));
    }

    @Test
    void createReservation_RejectsOverlappingReservation() {
        String roomId = "room-203";
        Room room = room(roomId, RoomStatus.AVAILABLE);

        Reservation existing = reservation("ex-1", roomId, ReservationStatus.CONFIRMED);
        existing.setCheckInDate(LocalDate.now().plusDays(2));
        existing.setCheckOutDate(LocalDate.now().plusDays(6));

        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));
        when(reservationRepository.findByRoomId(roomId)).thenReturn(List.of(existing));

        assertThrows(ConflictException.class, () -> reservationService.createReservation(
                request(roomId, LocalDate.now().plusDays(3), LocalDate.now().plusDays(5), 2),
                STAFF_UID));

        verify(reservationRepository, never()).save(any(Reservation.class));
    }

    @Test
    void createReservation_RejectsGuestsBeyondCapacity() {
        String roomId = "room-204";
        Room room = room(roomId, RoomStatus.AVAILABLE); // STANDARD sleeps 2

        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));

        assertThrows(IllegalArgumentException.class, () -> reservationService.createReservation(
                request(roomId, LocalDate.now().plusDays(1), LocalDate.now().plusDays(3), 3),
                STAFF_UID));
    }

    @Test
    void createReservation_RejectsPastCheckInAndInvertedDates() {
        String roomId = "room-205";
        Room room = room(roomId, RoomStatus.AVAILABLE);
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));

        assertThrows(IllegalArgumentException.class, () -> reservationService.createReservation(
                request(roomId, LocalDate.now().minusDays(1), LocalDate.now().plusDays(3), 1),
                STAFF_UID));

        assertThrows(IllegalArgumentException.class, () -> reservationService.createReservation(
                request(roomId, LocalDate.now().plusDays(3), LocalDate.now().plusDays(2), 1),
                STAFF_UID));
    }

    // ── Check-in ──

    @Test
    void checkIn_MarksReservationAndRoom() {
        String roomId = "room-301";
        String resId = "res-301";
        Room room = room(roomId, RoomStatus.RESERVED);
        Reservation reservation = reservation(resId, roomId, ReservationStatus.CONFIRMED);

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));
        when(housekeepingService.getTasksByRoomId(roomId)).thenReturn(Collections.emptyList());
        when(reservationRepository.updateStatus(eq(resId), any(ReservationStatus.class)))
                .thenAnswer(invocation -> {
                    reservation.setStatus(invocation.getArgument(1));
                    return reservation;
                });

        Reservation checkedIn = reservationService.checkInReservation(resId);

        assertEquals(ReservationStatus.CHECKED_IN, checkedIn.getStatus());
        verify(roomRepository).updateStatus(roomId, RoomStatus.OCCUPIED);
    }

    @Test
    void checkIn_RejectsUnconfirmedReservation() {
        String resId = "res-302";
        Reservation reservation = reservation(resId, "room-302", ReservationStatus.CONFIRMED);
        reservation.setStatus(ReservationStatus.CHECKED_OUT);

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> reservationService.checkInReservation(resId));
        assertEquals("Only confirmed reservations can be checked in", ex.getMessage());

        verify(reservationRepository, never())
                .updateStatus(anyString(), any(ReservationStatus.class));
    }

    @Test
    void checkIn_RejectsAlreadyCheckedInReservation() {
        String resId = "res-302b";
        Reservation reservation = reservation(resId, "room-302b", ReservationStatus.CHECKED_IN);

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> reservationService.checkInReservation(resId));
        assertEquals("This reservation has already been checked in", ex.getMessage());
    }

    @Test
    void checkIn_RejectsRoomBeingCleaned() {
        String roomId = "room-303";
        String resId = "res-303";
        Room room = room(roomId, RoomStatus.CLEANING);
        Reservation reservation = reservation(resId, roomId, ReservationStatus.CONFIRMED);

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));

        ConflictException ex = assertThrows(ConflictException.class,
                () -> reservationService.checkInReservation(resId));
        assertEquals(
                "Room is currently being cleaned and cannot be checked in until housekeeping is completed",
                ex.getMessage());
    }

    @Test
    void checkIn_RejectsRoomUnderMaintenance() {
        String roomId = "room-304";
        String resId = "res-304";
        Room room = room(roomId, RoomStatus.MAINTENANCE);
        Reservation reservation = reservation(resId, roomId, ReservationStatus.CONFIRMED);

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));

        ConflictException ex = assertThrows(ConflictException.class,
                () -> reservationService.checkInReservation(resId));
        assertEquals("Room is under maintenance and cannot be checked in", ex.getMessage());
    }

    @Test
    void checkIn_RejectsRoomWithOutstandingCleaningTask() {
        String roomId = "room-305";
        String resId = "res-305";
        Room room = room(roomId, RoomStatus.RESERVED);
        Reservation reservation = reservation(resId, roomId, ReservationStatus.CONFIRMED);

        HousekeepingTask activeTask = new HousekeepingTask();
        activeTask.setRoomId(roomId);
        activeTask.setStatus(HousekeepingTaskStatus.IN_PROGRESS);

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));
        when(housekeepingService.getTasksByRoomId(roomId)).thenReturn(List.of(activeTask));

        assertThrows(ConflictException.class, () -> reservationService.checkInReservation(resId));
    }

    // ── Checkout ──

    @Test
    void checkOut_RequiresABillToExist() {
        String roomId = "room-401";
        String resId = "res-401";
        Reservation reservation = reservation(resId, roomId, ReservationStatus.CHECKED_IN);

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));
        when(invoiceService.getInvoiceByReservationId(resId)).thenReturn(null);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> reservationService.checkOutReservation(resId));
        assertEquals("Generate the final bill before checking out", ex.getMessage());

        verify(reservationRepository, never())
                .updateStatus(anyString(), any(ReservationStatus.class));
    }

    @Test
    void checkOut_MovesStayToCleaningAndRaisesTask() {
        String roomId = "room-402";
        String resId = "res-402";
        Reservation reservation = reservation(resId, roomId, ReservationStatus.CHECKED_IN);

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));
        when(invoiceService.getInvoiceByReservationId(resId)).thenReturn(new Invoice());
        when(reservationRepository.updateStatus(eq(resId), any(ReservationStatus.class)))
                .thenAnswer(invocation -> {
                    reservation.setStatus(invocation.getArgument(1));
                    return reservation;
                });
        when(housekeepingService.getTasksByRoomId(roomId)).thenReturn(Collections.emptyList());

        CheckoutResponse response = reservationService.checkOutReservation(resId);

        assertEquals(ReservationStatus.CHECKED_OUT, response.reservation().getStatus());
        assertNotNull(response.invoice());
        verify(roomRepository).updateStatus(roomId, RoomStatus.CLEANING);
        verify(housekeepingService).createTask(any(CreateHousekeepingTaskRequest.class));
    }

    @Test
    void checkOut_DoesNotRaiseASecondCleaningTaskWhenOneIsOutstanding() {
        String roomId = "room-403";
        String resId = "res-403";
        Reservation reservation = reservation(resId, roomId, ReservationStatus.CHECKED_IN);

        HousekeepingTask existing = new HousekeepingTask();
        existing.setRoomId(roomId);
        existing.setTaskType(HousekeepingTaskType.CHECKOUT_CLEANING);
        existing.setStatus(HousekeepingTaskStatus.PENDING);

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));
        when(invoiceService.getInvoiceByReservationId(resId)).thenReturn(new Invoice());
        when(reservationRepository.updateStatus(resId, ReservationStatus.CHECKED_OUT))
                .thenReturn(reservation);
        when(housekeepingService.getTasksByRoomId(roomId)).thenReturn(List.of(existing));

        reservationService.checkOutReservation(resId);

        verify(roomRepository).updateStatus(roomId, RoomStatus.CLEANING);
        verify(housekeepingService, never()).createTask(any(CreateHousekeepingTaskRequest.class));
    }

    @Test
    void checkOut_IgnoresACompletedTaskFromAnEarlierStay() {
        String roomId = "room-404";
        String resId = "res-404";
        Reservation reservation = reservation(resId, roomId, ReservationStatus.CHECKED_IN);

        HousekeepingTask completed = new HousekeepingTask();
        completed.setRoomId(roomId);
        completed.setTaskType(HousekeepingTaskType.CHECKOUT_CLEANING);
        completed.setStatus(HousekeepingTaskStatus.COMPLETED);

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));
        when(invoiceService.getInvoiceByReservationId(resId)).thenReturn(new Invoice());
        when(reservationRepository.updateStatus(resId, ReservationStatus.CHECKED_OUT))
                .thenReturn(reservation);
        when(housekeepingService.getTasksByRoomId(roomId)).thenReturn(List.of(completed));

        reservationService.checkOutReservation(resId);

        verify(housekeepingService).createTask(any(CreateHousekeepingTaskRequest.class));
    }

    @Test
    void checkOut_RejectsStayThatIsNotCheckedIn() {
        String resId = "res-405";
        Reservation reservation = reservation(resId, "room-405", ReservationStatus.CONFIRMED);

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> reservationService.checkOutReservation(resId));
        assertEquals("Only checked-in reservations can be checked out", ex.getMessage());
    }

    @Test
    void generateFinalBill_RejectsStayThatIsNotCheckedIn() {
        String resId = "res-406";
        Reservation reservation = reservation(resId, "room-406", ReservationStatus.CONFIRMED);

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));

        assertThrows(IllegalArgumentException.class,
                () -> reservationService.generateFinalBill(resId, null));

        verify(invoiceService, never()).applyBill(any(), any(), any(), any());
    }

    // ── Cancellation ──

    @Test
    void cancel_ReturnsRoomToAvailableWhenNoOtherConfirmedStayHoldsIt() {
        String roomId = "room-501";
        String resId = "res-501";
        Room room = room(roomId, RoomStatus.RESERVED);
        Reservation reservation = reservation(resId, roomId, ReservationStatus.CONFIRMED);

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));
        when(reservationRepository.findByRoomId(roomId)).thenReturn(List.of(reservation));
        when(reservationRepository.updateStatus(resId, ReservationStatus.CANCELLED))
                .thenAnswer(invocation -> {
                    reservation.setStatus(ReservationStatus.CANCELLED);
                    return reservation;
                });

        reservationService.cancelReservationByStaff(resId);

        verify(roomRepository).updateStatus(roomId, RoomStatus.AVAILABLE);
    }

    @Test
    void cancel_LeavesRoomReservedWhenAnotherStayStillHoldsIt() {
        String roomId = "room-502";
        String resId1 = "res-502a";
        Room room = room(roomId, RoomStatus.RESERVED);

        Reservation target = reservation(resId1, roomId, ReservationStatus.CONFIRMED);
        Reservation other = reservation("res-502b", roomId, ReservationStatus.CONFIRMED);

        when(reservationRepository.findById(resId1)).thenReturn(Optional.of(target));
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));
        when(reservationRepository.findByRoomId(roomId)).thenReturn(List.of(target, other));
        when(reservationRepository.updateStatus(resId1, ReservationStatus.CANCELLED))
                .thenReturn(target);

        reservationService.cancelReservationByStaff(resId1);

        verify(roomRepository, never()).updateStatus(anyString(), any(RoomStatus.class));
    }

    @Test
    void cancel_RejectsStayThatHasAlreadyBeenCheckedIn() {
        String resId = "res-503";
        Reservation reservation = reservation(resId, "room-503", ReservationStatus.CHECKED_IN);

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> reservationService.cancelReservationByStaff(resId));
        assertEquals("This reservation cannot be cancelled", ex.getMessage());
    }

    // ── Availability ──

    @Test
    void isRoomAvailable_BlocksOverlappingDates() {
        String roomId = "room-601";
        Room room = room(roomId, RoomStatus.AVAILABLE);

        Reservation existing = reservation("p-1", roomId, ReservationStatus.CONFIRMED);
        existing.setCheckInDate(LocalDate.now().plusDays(1));
        existing.setCheckOutDate(LocalDate.now().plusDays(3));

        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));
        when(reservationRepository.findByRoomId(roomId)).thenReturn(List.of(existing));

        assertFalse(reservationService.isRoomAvailable(
                roomId, LocalDate.now().plusDays(1), LocalDate.now().plusDays(3)));

        assertTrue(reservationService.isRoomAvailable(
                roomId, LocalDate.now().plusDays(5), LocalDate.now().plusDays(7)));
    }

    @Test
    void isRoomAvailable_RefusesMaintenanceAndOccupiedRooms() {
        String maintenanceId = "room-602";
        String occupiedId = "room-603";

        when(roomRepository.findById(maintenanceId))
                .thenReturn(Optional.of(room(maintenanceId, RoomStatus.MAINTENANCE)));
        when(roomRepository.findById(occupiedId))
                .thenReturn(Optional.of(room(occupiedId, RoomStatus.OCCUPIED)));

        assertFalse(reservationService.isRoomAvailable(
                maintenanceId, LocalDate.now().plusDays(1), LocalDate.now().plusDays(2)));
        assertFalse(reservationService.isRoomAvailable(
                occupiedId, LocalDate.now().plusDays(1), LocalDate.now().plusDays(2)));
    }

    @Test
    void getAvailableRooms_FiltersUnavailableAndConflictingRooms() {
        Room free = room("room-1", RoomStatus.AVAILABLE);
        Room occupied = room("room-2", RoomStatus.OCCUPIED);
        Room conflicting = room("room-3", RoomStatus.AVAILABLE);

        LocalDate checkIn = LocalDate.now().plusDays(2);
        LocalDate checkOut = LocalDate.now().plusDays(5);

        Reservation clash = reservation("res-c", "room-3", ReservationStatus.CONFIRMED);
        clash.setCheckInDate(LocalDate.now().plusDays(3));
        clash.setCheckOutDate(LocalDate.now().plusDays(6));

        when(roomRepository.findAll()).thenReturn(List.of(free, occupied, conflicting));
        when(reservationRepository.findAll()).thenReturn(List.of(clash));

        List<Room> available = reservationService.getAvailableRooms(checkIn, checkOut, 2);

        assertEquals(1, available.size());
        assertEquals("room-1", available.get(0).getRoomId());
    }

    @Test
    void getAvailableRooms_ThrowsOnInvalidDates() {
        assertThrows(IllegalArgumentException.class, () ->
                reservationService.getAvailableRooms(null, LocalDate.now().plusDays(1), 1));

        assertThrows(IllegalArgumentException.class, () ->
                reservationService.getAvailableRooms(LocalDate.now().plusDays(1), null, 1));

        assertThrows(IllegalArgumentException.class, () ->
                reservationService.getAvailableRooms(
                        LocalDate.now().minusDays(1), LocalDate.now().plusDays(2), 1));

        assertThrows(IllegalArgumentException.class, () ->
                reservationService.getAvailableRooms(
                        LocalDate.now().plusDays(3), LocalDate.now().plusDays(2), 1));
    }

    // ── Legacy PENDING confirmation ──

    @Test
    void confirm_LegacyPendingReservation_ReservesRoomAndOpensInvoice() {
        String roomId = "room-701";
        String resId = "res-701";
        Room room = room(roomId, RoomStatus.AVAILABLE);
        Reservation reservation = reservation(resId, roomId, ReservationStatus.PENDING);

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));
        when(reservationRepository.findByRoomId(roomId)).thenReturn(List.of(reservation));
        when(reservationRepository.updateStatus(resId, ReservationStatus.CONFIRMED))
                .thenReturn(reservation);

        reservationService.confirmReservation(resId);

        verify(roomRepository).updateStatus(roomId, RoomStatus.RESERVED);
        verify(invoiceService).ensureInvoice(reservation);
    }

    @Test
    void confirm_FailsOnAlreadyConfirmed() {
        String resId = "res-702";
        Reservation reservation = reservation(resId, "room-702", ReservationStatus.CONFIRMED);

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> reservationService.confirmReservation(resId));
        assertEquals("Only pending reservations can be confirmed", ex.getMessage());
    }

    @Test
    void confirm_FailsWhenRoomInMaintenance() {
        String roomId = "room-703";
        String resId = "res-703";
        Room room = room(roomId, RoomStatus.MAINTENANCE);
        Reservation reservation = reservation(resId, roomId, ReservationStatus.PENDING);

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));

        ConflictException ex = assertThrows(ConflictException.class,
                () -> reservationService.confirmReservation(resId));
        assertEquals("Room is not available for confirmation", ex.getMessage());
    }

    @Test
    void confirm_RejectsOverlappingReservation() {
        String roomId = "room-704";
        String resId2 = "res-704b";
        Room room = room(roomId, RoomStatus.RESERVED);

        Reservation res1 = reservation("res-704a", roomId, ReservationStatus.CONFIRMED);
        res1.setCheckInDate(LocalDate.now().plusDays(1));
        res1.setCheckOutDate(LocalDate.now().plusDays(4));

        Reservation res2 = reservation(resId2, roomId, ReservationStatus.PENDING);
        res2.setCheckInDate(LocalDate.now().plusDays(2));
        res2.setCheckOutDate(LocalDate.now().plusDays(5));

        when(reservationRepository.findById(resId2)).thenReturn(Optional.of(res2));
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));
        when(reservationRepository.findByRoomId(roomId)).thenReturn(List.of(res1, res2));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> reservationService.confirmReservation(resId2));
        assertEquals("Room is already reserved for the selected dates", ex.getMessage());
    }

    @Test
    void testMaxGuestsForRoomType() {
        assertEquals(2, ReservationService.getMaxGuestsForRoom(roomWithType(RoomType.STANDARD)));
        assertEquals(3, ReservationService.getMaxGuestsForRoom(roomWithType(RoomType.DELUXE)));
        assertEquals(4, ReservationService.getMaxGuestsForRoom(roomWithType(RoomType.SUITE)));
        assertEquals(6, ReservationService.getMaxGuestsForRoom(roomWithType(RoomType.FAMILY)));
        assertEquals(4, ReservationService.getMaxGuestsForRoom(new Room()));
    }

    private Room roomWithType(RoomType type) {
        Room room = new Room();
        room.setRoomType(type);
        return room;
    }

    @Test
    void reservationIsNotFoundById() {
        when(reservationRepository.findById("missing")).thenReturn(Optional.empty());

        assertThrows(com.hotel.hotel_management.exception.ResourceNotFoundException.class,
                () -> reservationService.getReservationById("missing"));
    }

    @Test
    void eqMatcherIsUsedForStatusUpdates() {
        // Guards against a regression where the status argument was passed
        // positionally and silently mismatched.
        String resId = "res-801";
        Reservation reservation = reservation(resId, "room-801", ReservationStatus.CONFIRMED);
        reservation.setCheckInDate(LocalDate.now().plusDays(1));

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));
        when(roomRepository.findById("room-801"))
                .thenReturn(Optional.of(room("room-801", RoomStatus.RESERVED)));
        when(housekeepingService.getTasksByRoomId("room-801"))
                .thenReturn(Collections.emptyList());
        when(reservationRepository.updateStatus(eq(resId), eq(ReservationStatus.CHECKED_IN)))
                .thenReturn(reservation);

        reservationService.checkInReservation(resId);

        verify(reservationRepository).updateStatus(resId, ReservationStatus.CHECKED_IN);
    }
}
