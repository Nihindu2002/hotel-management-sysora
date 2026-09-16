package com.hotel.hotel_management.invoice;

import com.google.firebase.auth.FirebaseToken;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {

    private final InvoiceService invoiceService;

    public InvoiceController(InvoiceService invoiceService) {
        this.invoiceService = invoiceService;
    }

    @PostMapping("/reservation/{reservationId}")
    public ResponseEntity<Invoice> createInvoice(
            @PathVariable String reservationId) {

        return ResponseEntity.ok(
                invoiceService.createInvoice(reservationId));
    }

    @GetMapping
    public ResponseEntity<java.util.List<Invoice>> getAllInvoices() {
        return ResponseEntity.ok(
                invoiceService.getAllInvoices());
    }
    @GetMapping("/{invoiceId}")
    public ResponseEntity<Invoice> getInvoice(
            @PathVariable String invoiceId) {

        return ResponseEntity.ok(
                invoiceService.getInvoiceById(invoiceId));
    }

    @GetMapping("/my")
    public ResponseEntity<java.util.List<Invoice>> getMyInvoices(
            @AuthenticationPrincipal FirebaseToken token) {

        return ResponseEntity.ok(
                invoiceService.getMyInvoices(
                        token.getUid()));
    }

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

    @DeleteMapping("/{invoiceId}")
public ResponseEntity<Void> deleteInvoice(
        @PathVariable String invoiceId) {

    invoiceService.deleteInvoice(invoiceId);

    return ResponseEntity.noContent().build();
}
}