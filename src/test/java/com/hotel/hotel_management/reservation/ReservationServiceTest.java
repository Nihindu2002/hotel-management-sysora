package com.hotel.hotel_management.reservation;

import com.hotel.hotel_management.housekeeping.CreateHousekeepingTaskRequest;
import com.hotel.hotel_management.housekeeping.HousekeepingService;
import com.hotel.hotel_management.housekeeping.HousekeepingTask;
import com.hotel.hotel_management.housekeeping.HousekeepingTaskPriority;
import com.hotel.hotel_management.housekeeping.HousekeepingTaskStatus;
import com.hotel.hotel_management.housekeeping.HousekeepingTaskType;
import com.hotel.hotel_management.room.Room;
import com.hotel.hotel_management.room.RoomRepository;
import com.hotel.hotel_management.room.RoomStatus;
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
    void testCheckIn_FailsWhenRoomNotReserved() {
        String roomId = "room-104";
        String resId = "res-4";

        Room room = new Room();
        room.setRoomId(roomId);
        room.setStatus(RoomStatus.CLEANING); // Room is cleaning, not reserved!

        Reservation reservation = new Reservation();
        reservation.setReservationId(resId);
        reservation.setRoomId(roomId);
        reservation.setStatus(ReservationStatus.CONFIRMED);

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> reservationService.checkInReservation(resId)
        );
        assertEquals("Room must be in RESERVED status to check in", ex.getMessage());
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
        assertEquals("Room is not available for confirmation", ex.getMessage());
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
    void testIsRoomAvailable_PendingReservationDoesNotBlock() {
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

        boolean available = reservationService.isRoomAvailable(
                roomId,
                LocalDate.now().plusDays(1),
                LocalDate.now().plusDays(3)
        );

        assertTrue(available);
    }
}

