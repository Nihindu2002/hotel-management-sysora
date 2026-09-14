package com.hotel.hotel_management.reservation;

import com.google.firebase.auth.FirebaseToken;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import org.springframework.web.bind.annotation.RequestParam;

import java.time.LocalDate;
import java.util.Map;


@RestController
@RequestMapping("/api/reservations")
public class ReservationController {

    private final ReservationService reservationService;

    public ReservationController(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Reservation createReservation(
            @Valid @RequestBody CreateReservationRequest request,
            Authentication authentication) {

        FirebaseToken token =
                (FirebaseToken) authentication.getPrincipal();

        return reservationService.createReservation(
                token.getUid(),
                request
        );
    }

    @GetMapping
    public List<Reservation> getAllReservations() {
        return reservationService.getAllReservations();
    }

    @GetMapping("/my")
    public List<Reservation> getMyReservations(
            Authentication authentication) {

        FirebaseToken token =
                (FirebaseToken) authentication.getPrincipal();

        return reservationService.getCustomerReservations(
                token.getUid()
        );
    }

    @GetMapping("/{reservationId}")
    public Reservation getReservationById(
            @PathVariable String reservationId,
            Authentication authentication) {

        FirebaseToken token =
                (FirebaseToken) authentication.getPrincipal();

        return reservationService.getReservationById(
                reservationId,
                token.getUid()
        );
    }

    @PatchMapping("/{reservationId}/cancel")
public Reservation cancelReservation(
        @PathVariable String reservationId,
        Authentication authentication) {

    FirebaseToken token =
            (FirebaseToken) authentication.getPrincipal();

    return reservationService.cancelReservation(
            reservationId,
            token.getUid()
    );
}

@PatchMapping("/{reservationId}/cancel-by-staff")
public Reservation cancelReservationByStaff(
        @PathVariable String reservationId) {

    return reservationService.cancelReservationByStaff(
            reservationId
    );
}

@PatchMapping("/{reservationId}/confirm")
public Reservation confirmReservation(
        @PathVariable String reservationId) {

    return reservationService.confirmReservation(
            reservationId
    );
}

@PatchMapping("/{reservationId}/check-in")
public Reservation checkInReservation(
        @PathVariable String reservationId) {

    return reservationService.checkInReservation(
            reservationId
    );
}

@PatchMapping("/{reservationId}/check-out")
public Reservation checkOutReservation(
        @PathVariable String reservationId) {

    return reservationService.checkOutReservation(
            reservationId
    );
}

@GetMapping("/availability")
public Map<String, Object> checkRoomAvailability(
        @RequestParam String roomId,
        @RequestParam LocalDate checkInDate,
        @RequestParam LocalDate checkOutDate) {

    boolean available = reservationService.isRoomAvailable(
            roomId,
            checkInDate,
            checkOutDate
    );

    return Map.of(
            "roomId", roomId,
            "checkInDate", checkInDate,
            "checkOutDate", checkOutDate,
            "available", available
    );
}
}