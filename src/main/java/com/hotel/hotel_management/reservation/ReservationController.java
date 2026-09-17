package com.hotel.hotel_management.reservation;
import com.google.firebase.auth.FirebaseToken;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Tag(name = "Reservations", description = "Hotel room booking and lifecycle management")
@RestController
@RequestMapping("/api/reservations")
public class ReservationController {

    private final ReservationService reservationService;

    public ReservationController(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    @Operation(summary = "Create reservation", description = "Creates a new room reservation (starts in PENDING status)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Reservation created"),
            @ApiResponse(responseCode = "400", description = "Validation error or room not available")
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Reservation createReservation(
            @Valid @RequestBody CreateReservationRequest request,
            @Parameter(hidden = true) Authentication authentication) {

        FirebaseToken token =
                (FirebaseToken) authentication.getPrincipal();

        return reservationService.createReservation(
                token.getUid(),
                request
        );
    }

    @Operation(summary = "Get all reservations", description = "Retrieves all reservations (Staff/Admin/Manager)")
    @GetMapping
    public List<Reservation> getAllReservations() {
        return reservationService.getAllReservations();
    }

    @Operation(summary = "Get my reservations", description = "Retrieves current authenticated customer's reservations")
    @GetMapping("/my")
    public List<Reservation> getMyReservations(
            @Parameter(hidden = true) Authentication authentication) {

        FirebaseToken token =
                (FirebaseToken) authentication.getPrincipal();

        return reservationService.getCustomerReservations(
                token.getUid()
        );
    }

    @Operation(summary = "Get reservation by ID", description = "Retrieves reservation details by reservationId")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Reservation found"),
            @ApiResponse(responseCode = "404", description = "Reservation not found")
    })
    @GetMapping("/{reservationId}")
    public Reservation getReservationById(
            @PathVariable String reservationId,
            @Parameter(hidden = true) Authentication authentication) {

        FirebaseToken token =
                (FirebaseToken) authentication.getPrincipal();

        return reservationService.getReservationById(
                reservationId,
                token.getUid()
        );
    }

    @Operation(summary = "Cancel reservation (by customer)", description = "Cancels a pending or confirmed reservation by the guest")
    @PatchMapping("/{reservationId}/cancel")
    public Reservation cancelReservation(
            @PathVariable String reservationId,
            @Parameter(hidden = true) Authentication authentication) {

        FirebaseToken token =
                (FirebaseToken) authentication.getPrincipal();

        return reservationService.cancelReservation(
                reservationId,
                token.getUid()
        );
    }

    @Operation(summary = "Cancel reservation by staff", description = "Cancels a reservation by hotel staff/manager")
    @PatchMapping("/{reservationId}/cancel-by-staff")
    public Reservation cancelReservationByStaff(
            @PathVariable String reservationId) {

        return reservationService.cancelReservationByStaff(
                reservationId
        );
    }

    @Operation(summary = "Confirm reservation", description = "Confirms a pending reservation and marks room as RESERVED")
    @PatchMapping("/{reservationId}/confirm")
    public Reservation confirmReservation(
            @PathVariable String reservationId) {

        return reservationService.confirmReservation(
                reservationId
        );
    }

    @Operation(summary = "Check in guest", description = "Checks in a confirmed reservation and marks room as OCCUPIED")
    @PatchMapping("/{reservationId}/check-in")
    public Reservation checkInReservation(
            @PathVariable String reservationId) {

        return reservationService.checkInReservation(
                reservationId
        );
    }

    @Operation(summary = "Check out guest", description = "Checks out guest, triggers room CLEANING and creates housekeeping task")
    @PatchMapping("/{reservationId}/check-out")
    public Reservation checkOutReservation(
            @PathVariable String reservationId) {

        return reservationService.checkOutReservation(
                reservationId
        );
    }

    @Operation(summary = "Check room availability or search available rooms", description = "Checks if a room is available or lists available rooms for specified date range")
    @GetMapping("/availability")
    public Object checkRoomAvailability(
            @RequestParam(required = false) String roomId,
            @RequestParam LocalDate checkInDate,
            @RequestParam LocalDate checkOutDate,
            @RequestParam(required = false) Integer numberOfGuests) {

        if (roomId != null && !roomId.isBlank()) {
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

        return reservationService.getAvailableRooms(
                checkInDate,
                checkOutDate,
                numberOfGuests
        );
    }
}