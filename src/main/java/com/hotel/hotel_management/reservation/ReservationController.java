package com.hotel.hotel_management.reservation;

import com.google.firebase.auth.FirebaseToken;
import com.hotel.hotel_management.invoice.Invoice;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Tag(name = "Reservations",
        description = "Front-desk reservations: booking, check-in, final bill, checkout")
@RestController
@RequestMapping("/api/reservations")
public class ReservationController {

    private final ReservationService reservationService;

    public ReservationController(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    @Operation(summary = "Check room availability or search available rooms",
            description = "Checks whether one room is free, or lists every room free for a date range")
    @GetMapping("/availability")
    public Object checkRoomAvailability(
            @RequestParam(required = false) String roomId,
            @RequestParam LocalDate checkInDate,
            @RequestParam LocalDate checkOutDate,
            @RequestParam(required = false) Integer numberOfGuests) {

        if (roomId != null && !roomId.isBlank()) {
            boolean available = reservationService.isRoomAvailable(
                    roomId, checkInDate, checkOutDate);

            return Map.of(
                    "roomId", roomId,
                    "checkInDate", checkInDate,
                    "checkOutDate", checkOutDate,
                    "available", available);
        }

        return reservationService.getAvailableRooms(
                checkInDate, checkOutDate, numberOfGuests);
    }

    @Operation(summary = "Create reservation",
            description = "Takes a booking at the desk. The occupant's details are recorded on the "
                    + "reservation itself and it is confirmed immediately — no approval step.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Reservation confirmed"),
            @ApiResponse(responseCode = "400", description = "Validation error or room unsuitable"),
            @ApiResponse(responseCode = "409", description = "Room unavailable or under maintenance")
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Reservation createReservation(
            @Valid @RequestBody CreateReservationRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token) {

        return reservationService.createReservation(
                request,
                token != null ? token.getUid() : null);
    }

    @Operation(summary = "Get all reservations", description = "Retrieves every reservation")
    @GetMapping
    public List<Reservation> getAllReservations() {
        return reservationService.getAllReservations();
    }

    @Operation(summary = "Get reservation by ID", description = "Retrieves a reservation by its id")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Reservation found"),
            @ApiResponse(responseCode = "404", description = "Reservation not found")
    })
    @GetMapping("/{reservationId}")
    public Reservation getReservationById(@PathVariable String reservationId) {
        return reservationService.getReservationById(reservationId);
    }

    @Operation(summary = "Cancel reservation",
            description = "Cancels a reservation that has not been checked in")
    @PatchMapping("/{reservationId}/cancel-by-staff")
    public Reservation cancelReservation(
            @PathVariable String reservationId) {

        return reservationService.cancelReservationByStaff(reservationId);
    }

    @Operation(summary = "Confirm reservation",
            description = "Confirms a reservation left in PENDING. New bookings are already confirmed.")
    @PatchMapping("/{reservationId}/confirm")
    public Reservation confirmReservation(
            @PathVariable String reservationId) {

        return reservationService.confirmReservation(reservationId);
    }

    @Operation(summary = "Check in guest",
            description = "Checks in a confirmed reservation and marks the room OCCUPIED")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Guest checked in"),
            @ApiResponse(responseCode = "400", description = "Reservation is not confirmed"),
            @ApiResponse(responseCode = "409", description = "Room is under maintenance or still being cleaned")
    })
    @PatchMapping("/{reservationId}/check-in")
    public Reservation checkInReservation(
            @PathVariable String reservationId) {

        return reservationService.checkInReservation(reservationId);
    }

    @Operation(summary = "Generate final bill",
            description = "Prices the stay from the room rate, the charge lines and any discount, "
                    + "and stores the result on the invoice. Totals are always computed by the backend.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Bill calculated"),
            @ApiResponse(responseCode = "400", description = "Discount or charges invalid, or the stay is not checked in")
    })
    @PostMapping("/{reservationId}/bill")
    public Invoice generateFinalBill(
            @PathVariable String reservationId,
            @RequestBody(required = false) CheckoutBillRequest request) {

        return reservationService.generateFinalBill(reservationId, request);
    }

    @Operation(summary = "Get final bill",
            description = "Returns the stay's current bill, or 404 if none has been opened")
    @GetMapping("/{reservationId}/bill")
    public ResponseEntity<Invoice> getBill(@PathVariable String reservationId) {

        Invoice invoice = reservationService.getBill(reservationId);
        return invoice != null
                ? ResponseEntity.ok(invoice)
                : ResponseEntity.notFound().build();
    }

    @Operation(summary = "Check out guest",
            description = "Completes checkout: the bill is frozen, the room becomes CLEANING, "
                    + "and a checkout-cleaning task is raised. A balance may remain owing.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Guest checked out"),
            @ApiResponse(responseCode = "400", description = "Stay is not checked in, or has no bill")
    })
    @PostMapping("/{reservationId}/check-out")
    public CheckoutResponse checkOutReservation(
            @PathVariable String reservationId) {

        return reservationService.checkOutReservation(reservationId);
    }
}
