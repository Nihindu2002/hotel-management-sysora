package com.hotel.hotel_management.customer;

import com.hotel.hotel_management.invoice.Invoice;
import com.hotel.hotel_management.invoice.InvoiceService;
import com.hotel.hotel_management.payment.PaymentService;
import com.hotel.hotel_management.reservation.Reservation;
import com.hotel.hotel_management.reservation.ReservationService;
import com.hotel.hotel_management.reservation.ReservationStatus;
import com.hotel.hotel_management.room.Room;
import com.hotel.hotel_management.room.RoomRepository;
import com.hotel.hotel_management.user.UpdateUserRequest;
import com.hotel.hotel_management.user.User;
import com.hotel.hotel_management.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CustomerServiceTest {

    private UserRepository userRepository;
    private ReservationService reservationService;
    private RoomRepository roomRepository;
    private InvoiceService invoiceService;
    private PaymentService paymentService;
    private CustomerService customerService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        reservationService = mock(ReservationService.class);
        roomRepository = mock(RoomRepository.class);
        invoiceService = mock(InvoiceService.class);
        paymentService = mock(PaymentService.class);

        customerService = new CustomerService(
                userRepository,
                reservationService,
                roomRepository,
                invoiceService,
                paymentService
        );
    }

    @Test
    void getMyProfile_Success() {
        User user = new User();
        user.setUid("cust-123");
        user.setEmail("customer@hotel.com");
        user.setFirstName("John");
        user.setLastName("Doe");
        user.setPhone("0771234567");
        user.setRole("CUSTOMER");
        user.setCreatedAt(Instant.now());

        when(userRepository.findByUid("cust-123")).thenReturn(Optional.of(user));

        CustomerProfileResponse profile = customerService.getMyProfile("cust-123");
        assertNotNull(profile);
        assertEquals("cust-123", profile.uid());
        assertEquals("customer@hotel.com", profile.email());
        assertEquals("John", profile.firstName());
        assertEquals("Doe", profile.lastName());
        assertEquals("0771234567", profile.phone());
        assertEquals("CUSTOMER", profile.role());
    }

    @Test
    void updateMyProfile_Success() {
        UpdateCustomerProfileRequest request = new UpdateCustomerProfileRequest("Jane", "Smith", "0779876543");

        User updatedUser = new User();
        updatedUser.setUid("cust-123");
        updatedUser.setEmail("customer@hotel.com");
        updatedUser.setFirstName("Jane");
        updatedUser.setLastName("Smith");
        updatedUser.setPhone("0779876543");
        updatedUser.setRole("CUSTOMER");
        updatedUser.setCreatedAt(Instant.now());

        when(userRepository.updateProfile(eq("cust-123"), any(UpdateUserRequest.class))).thenReturn(updatedUser);

        CustomerProfileResponse profile = customerService.updateMyProfile("cust-123", request);
        assertNotNull(profile);
        assertEquals("Jane", profile.firstName());
        assertEquals("Smith", profile.lastName());
        assertEquals("0779876543", profile.phone());
    }

    @Test
    void getUpcomingReservations_FiltersCorrectly() {
        LocalDate today = LocalDate.now();

        Reservation r1 = new Reservation();
        r1.setReservationId("r1");
        r1.setCheckInDate(today.plusDays(1));
        r1.setCheckOutDate(today.plusDays(5));
        r1.setStatus(ReservationStatus.CONFIRMED);

        Reservation r2 = new Reservation();
        r2.setReservationId("r2");
        r2.setCheckInDate(today.minusDays(5));
        r2.setCheckOutDate(today.minusDays(1));
        r2.setStatus(ReservationStatus.CHECKED_OUT);

        Reservation r3 = new Reservation();
        r3.setReservationId("r3");
        r3.setCheckInDate(today.plusDays(2));
        r3.setCheckOutDate(today.plusDays(4));
        r3.setStatus(ReservationStatus.CANCELLED);

        when(reservationService.getCustomerReservations("cust-123"))
                .thenReturn(List.of(r1, r2, r3));

        List<Reservation> upcoming = customerService.getUpcomingReservations("cust-123");
        assertEquals(1, upcoming.size());
        assertEquals("r1", upcoming.get(0).getReservationId());
    }

    @Test
    void getReservationHistory_FiltersCorrectly() {
        Reservation r1 = new Reservation();
        r1.setReservationId("r1");
        r1.setStatus(ReservationStatus.CHECKED_OUT);

        Reservation r2 = new Reservation();
        r2.setReservationId("r2");
        r2.setStatus(ReservationStatus.CANCELLED);

        Reservation r3 = new Reservation();
        r3.setReservationId("r3");
        r3.setStatus(ReservationStatus.CONFIRMED);

        when(reservationService.getCustomerReservations("cust-123"))
                .thenReturn(List.of(r1, r2, r3));

        List<Reservation> history = customerService.getReservationHistory("cust-123");
        assertEquals(2, history.size());
        assertTrue(history.stream().anyMatch(r -> "r1".equals(r.getReservationId())));
        assertTrue(history.stream().anyMatch(r -> "r2".equals(r.getReservationId())));
    }

    @Test
    void getCurrentStay_WhenCheckedIn_ReturnsStayDetails() {
        Reservation r = new Reservation();
        r.setReservationId("res-active");
        r.setRoomId("room-101");
        r.setStatus(ReservationStatus.CHECKED_IN);
        r.setCheckInDate(LocalDate.now());
        r.setCheckOutDate(LocalDate.now().plusDays(2));
        r.setNumberOfGuests(2);

        Room room = new Room();
        room.setRoomId("room-101");
        room.setRoomNumber("101");

        when(reservationService.getCustomerReservations("cust-123")).thenReturn(List.of(r));
        when(roomRepository.findById("room-101")).thenReturn(Optional.of(room));

        CurrentStayResponse stay = customerService.getCurrentStay("cust-123");
        assertNotNull(stay);
        assertEquals("res-active", stay.reservation().getReservationId());
        assertEquals("101", stay.room().getRoomNumber());
        assertEquals(2, stay.numberOfGuests());
    }

    @Test
    void getCurrentStay_WhenNotCheckedIn_ReturnsNull() {
        Reservation r = new Reservation();
        r.setStatus(ReservationStatus.CONFIRMED);

        when(reservationService.getCustomerReservations("cust-123")).thenReturn(List.of(r));

        CurrentStayResponse stay = customerService.getCurrentStay("cust-123");
        assertNull(stay);
    }

    @Test
    void getCustomerDashboard_AggregatesMetrics() {
        Reservation r = new Reservation();
        r.setReservationId("res-1");
        r.setCheckInDate(LocalDate.now().plusDays(1));
        r.setCheckOutDate(LocalDate.now().plusDays(3));
        r.setStatus(ReservationStatus.CONFIRMED);

        Invoice inv1 = new Invoice();
        inv1.setStatus("UNPAID");

        Invoice inv2 = new Invoice();
        inv2.setStatus("PAID");

        Invoice inv3 = new Invoice();
        inv3.setStatus("PARTIALLY_PAID");

        when(reservationService.getCustomerReservations("cust-123")).thenReturn(List.of(r));
        when(invoiceService.getMyInvoices("cust-123")).thenReturn(List.of(inv1, inv2, inv3));

        CustomerDashboard dashboard = customerService.getCustomerDashboard("cust-123");
        assertNotNull(dashboard);
        assertEquals(1, dashboard.totalReservations());
        assertEquals(1, dashboard.upcomingReservations().size());
        assertNull(dashboard.activeStay());
        assertEquals(2, dashboard.pendingPayments()); // 1 UNPAID + 1 PARTIALLY_PAID
    }
}

