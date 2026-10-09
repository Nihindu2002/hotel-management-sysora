package com.hotel.hotel_management.invoice;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Invoices", description = "Billing and invoice management for hotel staff")
@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {

    private final InvoiceService invoiceService;

    public InvoiceController(InvoiceService invoiceService) {
        this.invoiceService = invoiceService;
    }

    @Operation(summary = "Create invoice for reservation",
            description = "Generates the room-charge invoice for a reservation. One invoice per reservation.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Invoice created"),
            @ApiResponse(responseCode = "400", description = "Reservation is cancelled, pending, or already invoiced"),
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
            @PathVariable String invoiceId) {

        return ResponseEntity.ok(
                invoiceService.getInvoiceById(invoiceId));
    }

    @Operation(summary = "Get invoice by reservation ID",
            description = "Retrieves the invoice associated with a reservation")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Invoice found"),
            @ApiResponse(responseCode = "404", description = "No invoice for this reservation")
    })
    @GetMapping("/reservation/{reservationId}")
    public ResponseEntity<Invoice> getInvoiceByReservation(
            @PathVariable String reservationId) {

        Invoice invoice = invoiceService.getInvoiceByReservationId(reservationId);
        if (invoice == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(invoice);
    }

    @Operation(summary = "Recalculate invoice status",
            description = "Recomputes UNPAID / PARTIALLY_PAID / PAID from recorded payments")
    @PatchMapping("/{invoiceId}/recalculate")
    public ResponseEntity<Invoice> recalculateInvoiceStatus(
            @PathVariable String invoiceId) {

        return ResponseEntity.ok(
                invoiceService.recalculateInvoiceStatus(invoiceId));
    }

    @Operation(summary = "Delete invoice", description = "Deletes an invoice if it has no payments")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Invoice deleted"),
            @ApiResponse(responseCode = "400", description = "Invoice has payments"),
            @ApiResponse(responseCode = "404", description = "Invoice not found")
    })
    @DeleteMapping("/{invoiceId}")
    public ResponseEntity<Void> deleteInvoice(
            @PathVariable String invoiceId) {

        invoiceService.deleteInvoice(invoiceId);

        return ResponseEntity.noContent().build();
    }
}
