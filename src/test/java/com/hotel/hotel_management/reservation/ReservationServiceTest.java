package com.hotel.hotel_management.reservation;

import com.hotel.hotel_management.housekeeping.CreateHousekeepingTaskRequest;
import com.hotel.hotel_management.housekeeping.HousekeepingService;
import com.hotel.hotel_management.housekeeping.HousekeepingTask;
import com.hotel.hotel_management.housekeeping.HousekeepingTaskPriority;
import com.hotel.hotel_management.housekeeping.HousekeepingTaskStatus;
import com.hotel.hotel_management.housekeeping.HousekeepingTaskType;
import com.hotel.hotel_management.exception.ConflictException;
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
    private ReservationService reservationService;

    @BeforeEach
    void setUp() {
        reservationRepository = mock(ReservationRepository.class);
        roomRepository = mock(RoomRepository.class);
        housekeepingService = mock(HousekeepingService.class);

        reservationService = new ReservationService(
                reservationRepository,
                roomRepository,
                housekeepingService
        );
    }

    @Test
    void testNormalFlow_Confirm_CheckIn_CheckOut() {
        String roomId = "room-101";
        String resId = "res-1";

        Room room = new Room();
        room.setRoomId(roomId);
        room.setStatus(RoomStatus.AVAILABLE);

        Reservation reservation = new Reservation();
        reservation.setReservationId(resId);
        reservation.setRoomId(roomId);
        reservation.setStatus(ReservationStatus.PENDING);
        reservation.setCheckInDate(LocalDate.now().plusDays(1));
        reservation.setCheckOutDate(LocalDate.now().plusDays(3));

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));
        when(reservationRepository.findByRoomId(roomId)).thenReturn(List.of(reservation));
        when(reservationRepository.updateStatus(eq(resId), any(ReservationStatus.class)))
                .thenAnswer(inv -> {
                    reservation.setStatus(inv.getArgument(1));
                    return reservation;
                });

        // 1. Confirm: Room becomes RESERVED
        Reservation confirmed = reservationService.confirmReservation(resId);
        assertEquals(ReservationStatus.CONFIRMED, confirmed.getStatus());
        verify(roomRepository).updateStatus(roomId, RoomStatus.RESERVED);

        // Update room status for next step
        room.setStatus(RoomStatus.RESERVED);

        // 2. Check-In: Room becomes OCCUPIED
        Reservation checkedIn = reservationService.checkInReservation(resId);
        assertEquals(ReservationStatus.CHECKED_IN, checkedIn.getStatus());
        verify(roomRepository).updateStatus(roomId, RoomStatus.OCCUPIED);

        // Update room status for next step
        room.setStatus(RoomStatus.OCCUPIED);
        when(housekeepingService.getTasksByRoomId(roomId)).thenReturn(Collections.emptyList());

        // 3. Check-Out: Room becomes CLEANING and Housekeeping task is created
        Reservation checkedOut = reservationService.checkOutReservation(resId);
        assertEquals(ReservationStatus.CHECKED_OUT, checkedOut.getStatus());
        verify(roomRepository).updateStatus(roomId, RoomStatus.CLEANING);
        verify(housekeepingService).createTask(any(CreateHousekeepingTaskRequest.class));
    }

    @Test
    void testCancellation_ConfirmedReservationRevertsRoomToAvailable() {
        String roomId = "room-102";
        String resId = "res-2";

        Room room = new Room();
        room.setRoomId(roomId);
        room.setStatus(RoomStatus.RESERVED);

        Reservation reservation = new Reservation();
        reservation.setReservationId(resId);
        reservation.setCustomerUid("cust-1");
        reservation.setRoomId(roomId);
        reservation.setStatus(ReservationStatus.CONFIRMED);

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));
        when(reservationRepository.findByRoomId(roomId)).thenReturn(List.of(reservation));
        when(reservationRepository.updateStatus(resId, ReservationStatus.CANCELLED))
                .thenAnswer(inv -> {
                    reservation.setStatus(ReservationStatus.CANCELLED);
                    return reservation;
                });

        reservationService.cancelReservation(resId, "cust-1");
        verify(roomRepository).updateStatus(roomId, RoomStatus.AVAILABLE);
    }

    @Test
    void testCancellation_PendingReservationDoesNotChangeRoomStatus() {
        String roomId = "room-103";
        String resId = "res-3";

        Room room = new Room();
        room.setRoomId(roomId);
        room.setStatus(RoomStatus.AVAILABLE);

        Reservation reservation = new Reservation();
        reservation.setReservationId(resId);
        reservation.setCustomerUid("cust-1");
        reservation.setRoomId(roomId);
        reservation.setStatus(ReservationStatus.PENDING);

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));
        when(reservationRepository.findByRoomId(roomId)).thenReturn(List.of(reservation));
        when(reservationRepository.updateStatus(resId, ReservationStatus.CANCELLED))
                .thenAnswer(inv -> {
                    reservation.setStatus(ReservationStatus.CANCELLED);
                    return reservation;
                });

        reservationService.cancelReservation(resId, "cust-1");
        verify(roomRepository, never()).updateStatus(anyString(), any(RoomStatus.class));
    }

    @Test
    void testCheckIn_FailsWhenRoomCleaning() {
        String roomId = "room-104";
        String resId = "res-4";

        Room room = new Room();
        room.setRoomId(roomId);
        room.setStatus(RoomStatus.CLEANING); // Room is cleaning!

        Reservation reservation = new Reservation();
        reservation.setReservationId(resId);
        reservation.setRoomId(roomId);
        reservation.setStatus(ReservationStatus.CONFIRMED);

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));

        ConflictException ex = assertThrows(
                ConflictException.class,
                () -> reservationService.checkInReservation(resId)
        );
        assertEquals("Room is currently being cleaned and cannot be checked in until housekeeping is completed", ex.getMessage());
    }

    @Test
    void testCheckIn_SuccessWhenRoomAvailable() {
        String roomId = "room-104b";
        String resId = "res-4b";

        Room room = new Room();
        room.setRoomId(roomId);
        room.setStatus(RoomStatus.AVAILABLE);

        Reservation reservation = new Reservation();
        reservation.setReservationId(resId);
        reservation.setRoomId(roomId);
        reservation.setStatus(ReservationStatus.CONFIRMED);

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));
        when(reservationRepository.updateStatus(resId, ReservationStatus.CHECKED_IN)).thenReturn(reservation);

        Reservation checkedIn = reservationService.checkInReservation(resId);
        assertNotNull(checkedIn);
        verify(roomRepository).updateStatus(roomId, RoomStatus.OCCUPIED);
    }

    @Test
    void testConfirm_DoubleBookingRejected() {
        String roomId = "room-105";
        String resId1 = "res-5a";
        String resId2 = "res-5b";

        Room room = new Room();
        room.setRoomId(roomId);
        room.setStatus(RoomStatus.RESERVED); // Room already reserved by resId1

        Reservation res1 = new Reservation();
        res1.setReservationId(resId1);
        res1.setRoomId(roomId);
        res1.setStatus(ReservationStatus.CONFIRMED);
        res1.setCheckInDate(LocalDate.now().plusDays(1));
        res1.setCheckOutDate(LocalDate.now().plusDays(4));

        Reservation res2 = new Reservation();
        res2.setReservationId(resId2);
        res2.setRoomId(roomId);
        res2.setStatus(ReservationStatus.PENDING);
        res2.setCheckInDate(LocalDate.now().plusDays(2));
        res2.setCheckOutDate(LocalDate.now().plusDays(5));

        when(reservationRepository.findById(resId2)).thenReturn(Optional.of(res2));
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));
        when(reservationRepository.findByRoomId(roomId)).thenReturn(List.of(res1, res2));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> reservationService.confirmReservation(resId2)
        );
        assertEquals("Room is already reserved for the selected dates", ex.getMessage());
    }

    @Test
    void testCheckOut_DuplicateTaskPrevented() {
        String roomId = "room-106";
        String resId = "res-6";

        Room room = new Room();
        room.setRoomId(roomId);
        room.setStatus(RoomStatus.OCCUPIED);

        Reservation reservation = new Reservation();
        reservation.setReservationId(resId);
        reservation.setRoomId(roomId);
        reservation.setStatus(ReservationStatus.CHECKED_IN);

        HousekeepingTask existingTask = new HousekeepingTask();
        existingTask.setRoomId(roomId);
        existingTask.setTaskType(HousekeepingTaskType.CHECKOUT_CLEANING);
        existingTask.setStatus(HousekeepingTaskStatus.PENDING); // Active task already exists!

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));
        when(reservationRepository.updateStatus(resId, ReservationStatus.CHECKED_OUT)).thenReturn(reservation);
        when(housekeepingService.getTasksByRoomId(roomId)).thenReturn(List.of(existingTask));

        reservationService.checkOutReservation(resId);

        verify(roomRepository).updateStatus(roomId, RoomStatus.CLEANING);
        verify(housekeepingService, never()).createTask(any(CreateHousekeepingTaskRequest.class));
    }

    @Test
    void testCheckOut_ActiveStayOverTaskPreventsConflict() {
        String roomId = "room-106b";
        String resId = "res-6b";

        Room room = new Room();
        room.setRoomId(roomId);
        room.setStatus(RoomStatus.OCCUPIED);

        Reservation reservation = new Reservation();
        reservation.setReservationId(resId);
        reservation.setRoomId(roomId);
        reservation.setStatus(ReservationStatus.CHECKED_IN);

        HousekeepingTask stayOverTask = new HousekeepingTask();
        stayOverTask.setRoomId(roomId);
        stayOverTask.setTaskType(HousekeepingTaskType.REGULAR_CLEANING);
        stayOverTask.setStatus(HousekeepingTaskStatus.IN_PROGRESS);

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));
        when(reservationRepository.updateStatus(resId, ReservationStatus.CHECKED_OUT)).thenReturn(reservation);
        when(housekeepingService.getTasksByRoomId(roomId)).thenReturn(List.of(stayOverTask));

        reservationService.checkOutReservation(resId);

        verify(roomRepository).updateStatus(roomId, RoomStatus.CLEANING);
        verify(housekeepingService, never()).createTask(any(CreateHousekeepingTaskRequest.class));
    }

    @Test
    void testIsRoomAvailable_PendingReservationBlocksOverlappingDates() {
        String roomId = "room-107";

        Room room = new Room();
        room.setRoomId(roomId);
        room.setStatus(RoomStatus.AVAILABLE);

        Reservation pendingRes = new Reservation();
        pendingRes.setReservationId("p-1");
        pendingRes.setRoomId(roomId);
        pendingRes.setStatus(ReservationStatus.PENDING);
        pendingRes.setCheckInDate(LocalDate.now().plusDays(1));
        pendingRes.setCheckOutDate(LocalDate.now().plusDays(3));

        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));
        when(reservationRepository.findByRoomId(roomId)).thenReturn(List.of(pendingRes));

        // Overlapping dates should be blocked
        boolean availableOverlapping = reservationService.isRoomAvailable(
                roomId,
                LocalDate.now().plusDays(1),
                LocalDate.now().plusDays(3)
        );
        assertFalse(availableOverlapping);

        // Non-overlapping dates should be available
        boolean availableOtherDates = reservationService.isRoomAvailable(
                roomId,
                LocalDate.now().plusDays(5),
                LocalDate.now().plusDays(7)
        );
        assertTrue(availableOtherDates);
    }

    @Test
    void testGetAvailableRooms_FiltersUnavailableAndConflictingRooms() {
        Room room1 = new Room();
        room1.setRoomId("room-1");
        room1.setStatus(RoomStatus.AVAILABLE);

        Room room2 = new Room();
        room2.setRoomId("room-2");
        room2.setStatus(RoomStatus.OCCUPIED);

        Room room3 = new Room();
        room3.setRoomId("room-3");
        room3.setStatus(RoomStatus.AVAILABLE);

        LocalDate checkIn = LocalDate.now().plusDays(2);
        LocalDate checkOut = LocalDate.now().plusDays(5);

        Reservation confirmedRes = new Reservation();
        confirmedRes.setReservationId("res-c");
        confirmedRes.setRoomId("room-3");
        confirmedRes.setStatus(ReservationStatus.CONFIRMED);
        confirmedRes.setCheckInDate(LocalDate.now().plusDays(3));
        confirmedRes.setCheckOutDate(LocalDate.now().plusDays(6));

        when(roomRepository.findAll()).thenReturn(List.of(room1, room2, room3));
        when(roomRepository.findById("room-1")).thenReturn(Optional.of(room1));
        when(roomRepository.findById("room-2")).thenReturn(Optional.of(room2));
        when(roomRepository.findById("room-3")).thenReturn(Optional.of(room3));

        when(reservationRepository.findByRoomId("room-1")).thenReturn(Collections.emptyList());
        when(reservationRepository.findByRoomId("room-3")).thenReturn(List.of(confirmedRes));
        when(reservationRepository.findAll()).thenReturn(List.of(confirmedRes));

        List<Room> availableRooms = reservationService.getAvailableRooms(checkIn, checkOut, 2);

        assertEquals(1, availableRooms.size());
        assertEquals("room-1", availableRooms.get(0).getRoomId());
    }

    @Test
    void testGetAvailableRooms_ThrowsOnInvalidDates() {
        assertThrows(IllegalArgumentException.class, () ->
                reservationService.getAvailableRooms(null, LocalDate.now().plusDays(1), 1));

        assertThrows(IllegalArgumentException.class, () ->
                reservationService.getAvailableRooms(LocalDate.now().plusDays(1), null, 1));

        assertThrows(IllegalArgumentException.class, () ->
                reservationService.getAvailableRooms(
                        LocalDate.now().minusDays(1),
                        LocalDate.now().plusDays(2),
                        1));

        assertThrows(IllegalArgumentException.class, () ->
                reservationService.getAvailableRooms(
                        LocalDate.now().plusDays(3),
                        LocalDate.now().plusDays(2),
                        1));
    }

    @Test
    void testCreateReservation_Success() {
        String roomId = "room-201";
        String customerUid = "cust-123";

        Room room = new Room();
        room.setRoomId(roomId);
        room.setRoomType(RoomType.STANDARD);
        room.setStatus(RoomStatus.AVAILABLE);

        LocalDate checkIn = LocalDate.now().plusDays(2);
        LocalDate checkOut = LocalDate.now().plusDays(5);
        CreateReservationRequest request = new CreateReservationRequest(roomId, checkIn, checkOut, 2);

        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));
        when(reservationRepository.findByRoomId(roomId)).thenReturn(Collections.emptyList());
        when(reservationRepository.save(any(Reservation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Reservation created = reservationService.createReservation(customerUid, request);

        assertNotNull(created);
        assertEquals(roomId, created.getRoomId());
        assertEquals(customerUid, created.getCustomerUid());
        assertEquals(checkIn, created.getCheckInDate());
        assertEquals(checkOut, created.getCheckOutDate());
        assertEquals(2, created.getNumberOfGuests());
        assertEquals(ReservationStatus.PENDING, created.getStatus());
        assertNotNull(created.getReservationId());
        verify(reservationRepository).save(any(Reservation.class));
    }

    @Test
    void testCreateReservation_FailsWhenRoomInMaintenance() {
        String roomId = "room-202";
        Room room = new Room();
        room.setRoomId(roomId);
        room.setStatus(RoomStatus.MAINTENANCE);

        CreateReservationRequest request = new CreateReservationRequest(
                roomId,
                LocalDate.now().plusDays(1),
                LocalDate.now().plusDays(3),
                2);

        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));

        assertThrows(ConflictException.class, () ->
                reservationService.createReservation("cust-1", request));
    }

    @Test
    void testCreateReservation_FailsWhenDatesOverlap() {
        String roomId = "room-203";
        Room room = new Room();
        room.setRoomId(roomId);
        room.setRoomType(RoomType.DELUXE);
        room.setStatus(RoomStatus.AVAILABLE);

        Reservation existing = new Reservation();
        existing.setReservationId("ex-1");
        existing.setRoomId(roomId);
        existing.setStatus(ReservationStatus.CONFIRMED);
        existing.setCheckInDate(LocalDate.now().plusDays(2));
        existing.setCheckOutDate(LocalDate.now().plusDays(6));

        CreateReservationRequest request = new CreateReservationRequest(
                roomId,
                LocalDate.now().plusDays(3),
                LocalDate.now().plusDays(5),
                2);

        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));
        when(reservationRepository.findByRoomId(roomId)).thenReturn(List.of(existing));

        assertThrows(ConflictException.class, () ->
                reservationService.createReservation("cust-1", request));
    }

    @Test
    void testCreateReservation_FailsWhenGuestsExceedCapacity() {
        String roomId = "room-204";
        Room room = new Room();
        room.setRoomId(roomId);
        room.setRoomType(RoomType.STANDARD); // max capacity 2
        room.setStatus(RoomStatus.AVAILABLE);

        CreateReservationRequest request = new CreateReservationRequest(
                roomId,
                LocalDate.now().plusDays(1),
                LocalDate.now().plusDays(3),
                3); // 3 guests exceeds capacity of 2

        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));

        assertThrows(IllegalArgumentException.class, () ->
                reservationService.createReservation("cust-1", request));
    }

    @Test
    void testConfirm_AutoCreatesInvoice() {
        InvoiceService mockInvoiceService = mock(InvoiceService.class);
        ReservationService serviceWithInvoice = new ReservationService(
                reservationRepository, roomRepository, housekeepingService, mockInvoiceService);

        String roomId = "room-inv";
        String resId = "res-inv";

        Room room = new Room();
        room.setRoomId(roomId);
        room.setStatus(RoomStatus.AVAILABLE);

        Reservation reservation = new Reservation();
        reservation.setReservationId(resId);
        reservation.setRoomId(roomId);
        reservation.setStatus(ReservationStatus.PENDING);
        reservation.setCheckInDate(LocalDate.now().plusDays(1));
        reservation.setCheckOutDate(LocalDate.now().plusDays(3));

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));
        when(reservationRepository.findByRoomId(roomId)).thenReturn(List.of(reservation));
        when(reservationRepository.updateStatus(eq(resId), eq(ReservationStatus.CONFIRMED))).thenReturn(reservation);

        serviceWithInvoice.confirmReservation(resId);

        verify(mockInvoiceService).createInvoice(resId);
    }

    @Test
    void testConfirm_FailsOnAlreadyConfirmed() {
        String resId = "res-already-conf";

        Reservation reservation = new Reservation();
        reservation.setReservationId(resId);
        reservation.setStatus(ReservationStatus.CONFIRMED);

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> reservationService.confirmReservation(resId)
        );
        assertEquals("Only pending reservations can be confirmed", ex.getMessage());
    }

    @Test
    void testConfirm_AllowsConfirmationForDifferentDatesOnSameRoom() {
        String roomId = "room-multi";
        String resId1 = "res-m1";
        String resId2 = "res-m2";

        Room room = new Room();
        room.setRoomId(roomId);
        room.setStatus(RoomStatus.RESERVED); // Already reserved by resId1

        Reservation res1 = new Reservation();
        res1.setReservationId(resId1);
        res1.setRoomId(roomId);
        res1.setStatus(ReservationStatus.CONFIRMED);
        res1.setCheckInDate(LocalDate.now().plusDays(1));
        res1.setCheckOutDate(LocalDate.now().plusDays(4));

        Reservation res2 = new Reservation();
        res2.setReservationId(resId2);
        res2.setRoomId(roomId);
        res2.setStatus(ReservationStatus.PENDING);
        res2.setCheckInDate(LocalDate.now().plusDays(10)); // Non-overlapping dates!
        res2.setCheckOutDate(LocalDate.now().plusDays(14));

        when(reservationRepository.findById(resId2)).thenReturn(Optional.of(res2));
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));
        when(reservationRepository.findByRoomId(roomId)).thenReturn(List.of(res1, res2));
        when(reservationRepository.updateStatus(eq(resId2), eq(ReservationStatus.CONFIRMED))).thenReturn(res2);

        Reservation confirmed = reservationService.confirmReservation(resId2);

        assertNotNull(confirmed);
        verify(roomRepository).updateStatus(roomId, RoomStatus.RESERVED);
    }

    @Test
    void testConfirm_FailsWhenRoomInMaintenance() {
        String roomId = "room-maint";
        String resId = "res-maint";

        Room room = new Room();
        room.setRoomId(roomId);
        room.setStatus(RoomStatus.MAINTENANCE);

        Reservation res = new Reservation();
        res.setReservationId(resId);
        res.setRoomId(roomId);
        res.setStatus(ReservationStatus.PENDING);
        res.setCheckInDate(LocalDate.now().plusDays(1));
        res.setCheckOutDate(LocalDate.now().plusDays(4));

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(res));
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));

        ConflictException ex = assertThrows(
                ConflictException.class,
                () -> reservationService.confirmReservation(resId)
        );
        assertEquals("Room is not available for confirmation", ex.getMessage());
    }
}

