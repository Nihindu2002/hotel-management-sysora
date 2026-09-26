package com.hotel.hotel_management.payment;

import com.google.firebase.auth.FirebaseToken;
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

@Tag(name = "Payments", description = "Payments recorded at the front desk")
@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @Operation(summary = "Record payment",
            description = "Records a payment against an invoice, updates the invoice status, and creates the finance income entry")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Payment recorded"),
            @ApiResponse(responseCode = "400", description = "Validation error or amount exceeds the outstanding balance"),
            @ApiResponse(responseCode = "404", description = "Invoice not found")
    })
    @PostMapping
    public ResponseEntity<Payment> createPayment(
            @Valid @RequestBody CreatePaymentRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token) {

        String performedBy = token != null ? token.getUid() : null;

        return ResponseEntity.ok(
                paymentService.createPayment(request, performedBy));
    }

    @Operation(summary = "Get payment by ID", description = "Retrieves payment details by paymentId")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Payment found"),
            @ApiResponse(responseCode = "404", description = "Payment not found")
    })
    @GetMapping("/{paymentId}")
    public ResponseEntity<Payment> getPayment(
            @PathVariable String paymentId) {

        return ResponseEntity.ok(
                paymentService.getPaymentById(paymentId));
    }

    @Operation(summary = "Get payments by invoice ID",
            description = "Retrieves all payments made towards an invoice")
    @GetMapping("/invoice/{invoiceId}")
    public ResponseEntity<List<Payment>> getPaymentsByInvoice(
            @PathVariable String invoiceId) {

        return ResponseEntity.ok(
                paymentService.getPaymentsByInvoice(invoiceId));
    }

    @Operation(summary = "Get all payments", description = "Retrieves all payments across the hotel")
    @GetMapping
    public ResponseEntity<List<Payment>> getAllPayments() {
        return ResponseEntity.ok(
                paymentService.getAllPayments());
    }

    @Operation(summary = "Refund payment",
            description = "Refunds a completed payment and updates the invoice and finance records")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Payment refunded"),
            @ApiResponse(responseCode = "400", description = "Payment already refunded or not completed"),
            @ApiResponse(responseCode = "404", description = "Payment not found")
    })
    @PatchMapping("/{paymentId}/refund")
    public ResponseEntity<Payment> refundPayment(
            @PathVariable String paymentId,
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token) {

        String performedBy = token != null ? token.getUid() : null;

        return ResponseEntity.ok(
                paymentService.refundPayment(paymentId, performedBy));
    }

    @Operation(summary = "Get payment status",
            description = "Returns the status of a payment (COMPLETED, REFUNDED, FAILED)")
    @GetMapping("/{paymentId}/status")
    public ResponseEntity<String> getPaymentStatus(
            @PathVariable String paymentId) {

        return ResponseEntity.ok(
                paymentService.getPaymentById(paymentId).getStatus());
    }
}
