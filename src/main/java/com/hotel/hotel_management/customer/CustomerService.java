package com.hotel.hotel_management.customer;

import com.hotel.hotel_management.invoice.Invoice;
import com.hotel.hotel_management.invoice.InvoiceService;
import com.hotel.hotel_management.payment.Payment;
import com.hotel.hotel_management.payment.PaymentService;
import com.hotel.hotel_management.reservation.Reservation;
import com.hotel.hotel_management.reservation.ReservationService;
import com.hotel.hotel_management.reservation.ReservationStatus;
import com.hotel.hotel_management.room.Room;
import com.hotel.hotel_management.room.RoomRepository;
import com.hotel.hotel_management.user.UpdateUserRequest;
import com.hotel.hotel_management.user.User;
import com.hotel.hotel_management.user.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class CustomerService {

    private final UserRepository userRepository;
    private final ReservationService reservationService;
    private final RoomRepository roomRepository;
    private final InvoiceService invoiceService;
    private final PaymentService paymentService;

    public CustomerService(
            UserRepository userRepository,
            ReservationService reservationService,
            RoomRepository roomRepository,
            InvoiceService invoiceService,
            PaymentService paymentService) {

        this.userRepository = userRepository;
        this.reservationService = reservationService;
        this.roomRepository = roomRepository;
        this.invoiceService = invoiceService;
        this.paymentService = paymentService;
    }

    public CustomerProfileResponse getMyProfile(String customerUid) {
        User user = userRepository.findByUid(customerUid)
                .orElseThrow(() -> new com.hotel.hotel_management.exception.ResourceNotFoundException("User not found"));

        return new CustomerProfileResponse(
                user.getUid(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getPhone(),
                user.getRole(),
                user.getCreatedAt()
        );
    }

    public CustomerProfileResponse updateMyProfile(String customerUid, UpdateCustomerProfileRequest request) {
        UpdateUserRequest updateUserRequest = new UpdateUserRequest(
                request.firstName(),
                request.lastName(),
                request.phone()
        );

        User updated = userRepository.updateProfile(customerUid, updateUserRequest);

        return new CustomerProfileResponse(
                updated.getUid(),
                updated.getEmail(),
                updated.getFirstName(),
                updated.getLastName(),
                updated.getPhone(),
                updated.getRole(),
                updated.getCreatedAt()
        );
    }

    public List<Reservation> getMyReservations(String customerUid) {
        return reservationService.getCustomerReservations(customerUid);
    }

    public Reservation getMyReservationById(String reservationId, String customerUid) {
        return reservationService.getReservationById(reservationId, customerUid);
    }

    public Reservation cancelMyReservation(String reservationId, String customerUid) {
        return reservationService.cancelReservation(reservationId, customerUid);
    }

    public List<Reservation> getUpcomingReservations(String customerUid) {
        LocalDate today = LocalDate.now();
        return reservationService.getCustomerReservations(customerUid).stream()
                .filter(r -> r.getCheckOutDate() != null && !r.getCheckOutDate().isBefore(today))
                .filter(r -> r.getStatus() != ReservationStatus.CANCELLED && r.getStatus() != ReservationStatus.CHECKED_OUT)
                .toList();
    }

    public List<Reservation> getReservationHistory(String customerUid) {
        return reservationService.getCustomerReservations(customerUid).stream()
                .filter(r -> r.getStatus() == ReservationStatus.CHECKED_OUT || r.getStatus() == ReservationStatus.CANCELLED)
                .toList();
    }

    public CurrentStayResponse getCurrentStay(String customerUid) {
        return reservationService.getCustomerReservations(customerUid).stream()
                .filter(r -> r.getStatus() == ReservationStatus.CHECKED_IN)
                .findFirst()
                .map(r -> {
                    Room room = roomRepository.findById(r.getRoomId()).orElse(null);
                    return new CurrentStayResponse(
                            r,
                            room,
                            r.getCheckInDate(),
                            r.getCheckOutDate(),
                            r.getNumberOfGuests()
                    );
                })
                .orElse(null);
    }

    public List<Invoice> getMyInvoices(String customerUid) {
        return invoiceService.getMyInvoices(customerUid);
    }

    public List<Payment> getMyPayments(String customerUid) {
        return paymentService.getCustomerPayments(customerUid);
    }

    public CustomerDashboard getCustomerDashboard(String customerUid) {
        List<Reservation> upcoming = getUpcomingReservations(customerUid);
        CurrentStayResponse currentStay = getCurrentStay(customerUid);
        long totalReservations = reservationService.getCustomerReservations(customerUid).size();

        long pendingPayments = invoiceService.getMyInvoices(customerUid).stream()
                .filter(inv -> "UNPAID".equalsIgnoreCase(inv.getStatus()) || "PARTIALLY_PAID".equalsIgnoreCase(inv.getStatus()))
                .count();

        return new CustomerDashboard(
                upcoming,
                currentStay,
                totalReservations,
                pendingPayments
        );
    }
}

