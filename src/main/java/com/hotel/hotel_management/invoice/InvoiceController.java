package com.hotel.hotel_management.invoice;
import com.google.firebase.auth.FirebaseToken;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Invoices", description = "Billing and invoice management")
@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {

    private final InvoiceService invoiceService;

    public InvoiceController(InvoiceService invoiceService) {
        this.invoiceService = invoiceService;
    }

    @Operation(summary = "Create invoice for reservation", description = "Generates an invoice linked to a reservation with room charges")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Invoice created"),
            @ApiResponse(responseCode = "404", description = "Reservation not found")
    })
    @PostMapping("/reservation/{reservationId}")
    public ResponseEntity<Invoice> createInvoice(
            @PathVariable String reservationId) {

        return ResponseEntity.ok(
                invoiceService.createInvoice(reservationId));
    }

    @Operation(summary = "Get all invoices", description = "Retrieves all invoices in the system")
    @GetMapping
    public ResponseEntity<List<Invoice>> getAllInvoices() {
        return ResponseEntity.ok(
                invoiceService.getAllInvoices());
    }

    @Operation(summary = "Get invoice by ID", description = "Retrieves invoice details by invoiceId")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Invoice found"),
            @ApiResponse(responseCode = "404", description = "Invoice not found")
    })
    @GetMapping("/{invoiceId}")
    public ResponseEntity<Invoice> getInvoice(
            @PathVariable String invoiceId,
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token,
            @Parameter(hidden = true) org.springframework.security.core.Authentication authentication) {

        Invoice invoice = invoiceService.getInvoiceById(invoiceId);

        boolean isCustomer = authentication != null &&
                authentication.getAuthorities()
                        .stream()
                        .anyMatch(authority ->
                                authority.getAuthority()
                                        .equals("ROLE_CUSTOMER"));

        if (isCustomer && token != null && !token.getUid().equals(invoice.getCustomerUid())) {
            throw new com.hotel.hotel_management.common.ForbiddenException(
                    "You are not authorized to view this invoice");
        }

        return ResponseEntity.ok(invoice);
    }

    @Operation(summary = "Get invoice by reservation ID", description = "Retrieves invoice associated with a reservation")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Invoice found"),
            @ApiResponse(responseCode = "404", description = "Invoice not found")
    })
    @GetMapping("/reservation/{reservationId}")
    public ResponseEntity<Invoice> getInvoiceByReservation(
            @PathVariable String reservationId,
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token,
            @Parameter(hidden = true) org.springframework.security.core.Authentication authentication) {

        Invoice invoice = invoiceService.getInvoiceByReservationId(reservationId);
        if (invoice == null) {
            return ResponseEntity.notFound().build();
        }

        boolean isCustomer = authentication != null &&
                authentication.getAuthorities()
                        .stream()
                        .anyMatch(authority ->
                                authority.getAuthority()
                                        .equals("ROLE_CUSTOMER"));

        if (isCustomer && token != null && !token.getUid().equals(invoice.getCustomerUid())) {
            throw new com.hotel.hotel_management.common.ForbiddenException(
                    "You are not authorized to view this invoice");
        }

        return ResponseEntity.ok(invoice);
    }

    @Operation(summary = "Get my invoices", description = "Retrieves invoices for the authenticated customer")
    @GetMapping("/my")
    public ResponseEntity<List<Invoice>> getMyInvoices(
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token) {

        return ResponseEntity.ok(
                invoiceService.getMyInvoices(
                        token.getUid()));
    }

    @Operation(summary = "Update invoice amounts", description = "Adjusts additional charges, taxes, discounts on an unpaid/partially-paid invoice")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Invoice updated"),
            @ApiResponse(responseCode = "400", description = "Cannot update paid invoice or validation error"),
            @ApiResponse(responseCode = "404", description = "Invoice not found")
    })
    @PatchMapping("/{invoiceId}/amounts")
    public ResponseEntity<Invoice> updateInvoiceAmounts(
            @PathVariable String invoiceId,
            @jakarta.validation.Valid
            @RequestBody UpdateInvoiceRequest request) {

        return ResponseEntity.ok(
                invoiceService.updateInvoiceAmounts(
                        invoiceId,
                        request));
    }

    @Operation(summary = "Delete invoice", description = "Deletes an invoice if unpaid")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Invoice deleted"),
            @ApiResponse(responseCode = "400", description = "Cannot delete paid or partially-paid invoice"),
            @ApiResponse(responseCode = "404", description = "Invoice not found")
    })
    @DeleteMapping("/{invoiceId}")
    public ResponseEntity<Void> deleteInvoice(
            @PathVariable String invoiceId) {

        invoiceService.deleteInvoice(invoiceId);

        return ResponseEntity.noContent().build();
    }
}