package com.hotel.hotel_management.customer;

import com.google.firebase.auth.FirebaseToken;
import com.hotel.hotel_management.invoice.Invoice;
import com.hotel.hotel_management.payment.Payment;
import com.hotel.hotel_management.reservation.Reservation;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Customer", description = "Customer self-service portal (Profile, Reservations, Billing, Stays)")
@RestController
@RequestMapping("/api/customer")
public class CustomerController {

    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @Operation(summary = "Get my profile", description = "Retrieves profile of the authenticated customer")
    @GetMapping("/profile")
    public ResponseEntity<CustomerProfileResponse> getMyProfile(
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token) {
        return ResponseEntity.ok(customerService.getMyProfile(token.getUid()));
    }

    @Operation(summary = "Update my profile", description = "Updates firstName, lastName, and phone number for the authenticated customer")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Profile updated"),
            @ApiResponse(responseCode = "400", description = "Validation error"),
            @ApiResponse(responseCode = "404", description = "Customer profile not found")
    })
    @PutMapping("/profile")
    public ResponseEntity<CustomerProfileResponse> updateMyProfile(
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token,
            @Valid @RequestBody UpdateCustomerProfileRequest request) {
        return ResponseEntity.ok(customerService.updateMyProfile(token.getUid(), request));
    }

    @Operation(summary = "Get my reservations", description = "Retrieves all reservations for the authenticated customer")
    @GetMapping("/reservations")
    public ResponseEntity<List<Reservation>> getMyReservations(
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token) {
        return ResponseEntity.ok(customerService.getMyReservations(token.getUid()));
    }

    @Operation(summary = "Get my reservation by ID", description = "Retrieves reservation details belonging to the authenticated customer")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Reservation found"),
            @ApiResponse(responseCode = "404", description = "Reservation not found")
    })
    @GetMapping("/reservations/{reservationId}")
    public ResponseEntity<Reservation> getMyReservationById(
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token,
            @PathVariable String reservationId) {
        return ResponseEntity.ok(customerService.getMyReservationById(reservationId, token.getUid()));
    }

    @Operation(summary = "Cancel my reservation", description = "Cancels customer reservation if pending or confirmed")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Reservation cancelled"),
            @ApiResponse(responseCode = "400", description = "Reservation cannot be cancelled in current status"),
            @ApiResponse(responseCode = "404", description = "Reservation not found")
    })
    @PatchMapping("/reservations/{reservationId}/cancel")
    public ResponseEntity<Reservation> cancelMyReservation(
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token,
            @PathVariable String reservationId) {
        return ResponseEntity.ok(customerService.cancelMyReservation(reservationId, token.getUid()));
    }

    @Operation(summary = "Get upcoming reservations", description = "Retrieves upcoming confirmed or pending reservations for current customer")
    @GetMapping("/reservations/upcoming")
    public ResponseEntity<List<Reservation>> getUpcomingReservations(
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token) {
        return ResponseEntity.ok(customerService.getUpcomingReservations(token.getUid()));
    }

    @Operation(summary = "Get reservation history", description = "Retrieves past checked-out or cancelled reservations")
    @GetMapping("/reservations/history")
    public ResponseEntity<List<Reservation>> getReservationHistory(
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token) {
        return ResponseEntity.ok(customerService.getReservationHistory(token.getUid()));
    }

    @Operation(summary = "Get current stay", description = "Retrieves active checked-in stay details for customer")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Active stay found"),
            @ApiResponse(responseCode = "404", description = "No active stay found")
    })
    @GetMapping("/stay")
    public ResponseEntity<CurrentStayResponse> getCurrentStay(
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token) {
        CurrentStayResponse stay = customerService.getCurrentStay(token.getUid());
        if (stay == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(stay);
    }

    @Operation(summary = "Get my invoices", description = "Retrieves all invoices for reservations belonging to current customer")
    @GetMapping("/invoices")
    public ResponseEntity<List<Invoice>> getMyInvoices(
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token) {
        return ResponseEntity.ok(customerService.getMyInvoices(token.getUid()));
    }

    @Operation(summary = "Get my payments", description = "Retrieves all payments made by current customer")
    @GetMapping("/payments")
    public ResponseEntity<List<Payment>> getMyPayments(
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token) {
        return ResponseEntity.ok(customerService.getMyPayments(token.getUid()));
    }

    @Operation(summary = "Get customer dashboard summary", description = "Retrieves combined customer dashboard (profile, active stay, upcoming count, unpaid invoices count)")
    @GetMapping("/dashboard")
    public ResponseEntity<CustomerDashboard> getCustomerDashboard(
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token) {
        return ResponseEntity.ok(customerService.getCustomerDashboard(token.getUid()));
    }
}

