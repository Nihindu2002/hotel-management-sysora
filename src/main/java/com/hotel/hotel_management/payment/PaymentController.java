package com.hotel.hotel_management.payment;

import com.google.firebase.auth.FirebaseToken;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping
    public ResponseEntity<Payment> createPayment(
            @Valid @RequestBody CreatePaymentRequest request,
            @AuthenticationPrincipal FirebaseToken token,
            Authentication authentication) {

        boolean isCustomer =
                authentication.getAuthorities()
                        .stream()
                        .anyMatch(authority ->
                                authority.getAuthority()
                                        .equals("ROLE_CUSTOMER"));

        return ResponseEntity.ok(
                paymentService.createPayment(
                        request,
                        isCustomer ? token.getUid() : null));
    }

    @GetMapping("/{paymentId}")
    public ResponseEntity<Payment> getPayment(
            @PathVariable String paymentId,
            @AuthenticationPrincipal FirebaseToken token,
            Authentication authentication) {

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

    @GetMapping("/invoice/{invoiceId}")
    public ResponseEntity<java.util.List<Payment>> getPaymentsByInvoice(
            @PathVariable String invoiceId,
            @AuthenticationPrincipal FirebaseToken token,
            Authentication authentication) {

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

    @GetMapping
public ResponseEntity<java.util.List<Payment>> getAllPayments() {
    return ResponseEntity.ok(
            paymentService.getAllPayments());
}

@PatchMapping("/{paymentId}/refund")
public ResponseEntity<Payment> refundPayment(
        @PathVariable String paymentId) {

    return ResponseEntity.ok(
            paymentService.refundPayment(paymentId));
}

    @GetMapping("/{paymentId}/status")
    public ResponseEntity<String> getPaymentStatus(
            @PathVariable String paymentId,
            @AuthenticationPrincipal FirebaseToken token,
            Authentication authentication) {

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