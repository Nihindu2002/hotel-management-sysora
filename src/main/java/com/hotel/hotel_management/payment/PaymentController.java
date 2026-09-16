package com.hotel.hotel_management.payment;
import com.google.firebase.auth.FirebaseToken;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Payments", description = "Payment processing, verification, and refunds")
@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @Operation(summary = "Process payment", description = "Records a payment against an invoice and updates invoice status and finance records")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Payment recorded"),
            @ApiResponse(responseCode = "400", description = "Validation error or overpayment"),
            @ApiResponse(responseCode = "404", description = "Invoice not found")
    })
    @PostMapping
    public ResponseEntity<Payment> createPayment(
            @Valid @RequestBody CreatePaymentRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token,
            @Parameter(hidden = true) Authentication authentication) {

        boolean isCustomer =
                authentication.getAuthorities()
                        .stream()
                        .anyMatch(authority ->
                                authority.getAuthority()
                                        .equals("ROLE_CUSTOMER"));

        String userUid = token != null ? token.getUid() : null;

        return ResponseEntity.ok(
                paymentService.createPayment(
                        request,
                        isCustomer ? userUid : null,
                        userUid));
    }

    @Operation(summary = "Get payment by ID", description = "Retrieves payment details by paymentId")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Payment found"),
            @ApiResponse(responseCode = "404", description = "Payment not found")
    })
    @GetMapping("/{paymentId}")
    public ResponseEntity<Payment> getPayment(
            @PathVariable String paymentId,
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token,
            @Parameter(hidden = true) Authentication authentication) {

        boolean isCustomer =
                authentication.getAuthorities()
                        .stream()
                        .anyMatch(authority ->
                                authority.getAuthority()
                                        .equals("ROLE_CUSTOMER"));

        return ResponseEntity.ok(
                paymentService.getPaymentById(
                        paymentId,
                        isCustomer ? token.getUid() : null));
    }

    @Operation(summary = "Get payments by invoice ID", description = "Retrieves all payments made towards an invoice")
    @GetMapping("/invoice/{invoiceId}")
    public ResponseEntity<List<Payment>> getPaymentsByInvoice(
            @PathVariable String invoiceId,
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token,
            @Parameter(hidden = true) Authentication authentication) {

        boolean isCustomer =
                authentication.getAuthorities()
                        .stream()
                        .anyMatch(authority ->
                                authority.getAuthority()
                                        .equals("ROLE_CUSTOMER"));

        return ResponseEntity.ok(
                paymentService.getPaymentsByInvoice(
                        invoiceId,
                        isCustomer ? token.getUid() : null));
    }

    @Operation(summary = "Get all payments", description = "Retrieves all payments across the hotel (Staff/Admin/Accountant)")
    @GetMapping
    public ResponseEntity<List<Payment>> getAllPayments() {
        return ResponseEntity.ok(
                paymentService.getAllPayments());
    }

    @Operation(summary = "Refund payment", description = "Refunds a completed payment and updates invoice & finance records")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Payment refunded"),
            @ApiResponse(responseCode = "400", description = "Payment already refunded or invalid status"),
            @ApiResponse(responseCode = "404", description = "Payment not found")
    })
    @PatchMapping("/{paymentId}/refund")
    public ResponseEntity<Payment> refundPayment(
            @PathVariable String paymentId,
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token) {

        String userUid = token != null ? token.getUid() : null;

        return ResponseEntity.ok(
                paymentService.refundPayment(paymentId, userUid));
    }

    @Operation(summary = "Get payment status", description = "Returns the status of a payment (COMPLETED, REFUNDED, FAILED)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Payment status"),
            @ApiResponse(responseCode = "404", description = "Payment not found")
    })
    @GetMapping("/{paymentId}/status")
    public ResponseEntity<String> getPaymentStatus(
            @PathVariable String paymentId,
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token,
            @Parameter(hidden = true) Authentication authentication) {

        boolean isCustomer =
                authentication.getAuthorities()
                        .stream()
                        .anyMatch(authority ->
                                authority.getAuthority()
                                        .equals("ROLE_CUSTOMER"));

        Payment payment =
                paymentService.getPaymentById(
                        paymentId,
                        isCustomer ? token.getUid() : null);

        return ResponseEntity.ok(
                payment.getStatus());
    }
}