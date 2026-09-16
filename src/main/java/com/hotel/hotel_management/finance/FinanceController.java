package com.hotel.hotel_management.finance;
import com.google.firebase.auth.FirebaseToken;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@Tag(name = "Finance", description = "Financial accounting, income/expense tracking, and summaries")
@RestController
@RequestMapping("/api/finance")
public class FinanceController {

    private final FinanceService financeService;

    public FinanceController(FinanceService financeService) {
        this.financeService = financeService;
    }

    @Operation(summary = "Create manual finance transaction", description = "Records a manual income or expense transaction")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Transaction created"),
            @ApiResponse(responseCode = "400", description = "Validation error or invalid amount")
    })
    @PostMapping("/transactions")
    public ResponseEntity<FinanceTransaction> createTransaction(
            @RequestBody CreateFinanceTransactionRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token) {

        String performedBy = token != null ? token.getUid() : "SYSTEM";
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(financeService.createTransaction(request, performedBy));
    }

    @Operation(summary = "Get all finance transactions", description = "Retrieves all recorded financial transactions")
    @GetMapping("/transactions")
    public ResponseEntity<List<FinanceTransaction>> getAllTransactions() {
        return ResponseEntity.ok(financeService.getAllTransactions());
    }

    @Operation(summary = "Get transaction by ID", description = "Retrieves finance transaction details by transactionId")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Transaction found"),
            @ApiResponse(responseCode = "404", description = "Transaction not found")
    })
    @GetMapping("/transactions/{transactionId}")
    public ResponseEntity<FinanceTransaction> getTransactionById(
            @PathVariable String transactionId) {
        return ResponseEntity.ok(financeService.getTransactionById(transactionId));
    }

    @Operation(summary = "Update finance transaction", description = "Updates category, amount, or description of a transaction")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Transaction updated"),
            @ApiResponse(responseCode = "404", description = "Transaction not found")
    })
    @PutMapping("/transactions/{transactionId}")
    public ResponseEntity<FinanceTransaction> updateTransaction(
            @PathVariable String transactionId,
            @RequestBody UpdateFinanceTransactionRequest request) {
        return ResponseEntity.ok(financeService.updateTransaction(transactionId, request));
    }

    @Operation(summary = "Cancel finance transaction", description = "Marks a finance transaction as CANCELLED")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Transaction cancelled"),
            @ApiResponse(responseCode = "404", description = "Transaction not found")
    })
    @PatchMapping("/transactions/{transactionId}/cancel")
    public ResponseEntity<FinanceTransaction> cancelTransaction(
            @PathVariable String transactionId) {
        return ResponseEntity.ok(financeService.cancelTransaction(transactionId));
    }

    @Operation(summary = "Get transactions by type", description = "Filters transactions by type (INCOME or EXPENSE)")
    @GetMapping("/transactions/type/{type}")
    public ResponseEntity<List<FinanceTransaction>> getTransactionsByType(
            @PathVariable FinanceTransactionType type) {
        return ResponseEntity.ok(financeService.getTransactionsByType(type));
    }

    @Operation(summary = "Get transactions by category", description = "Filters transactions by category (ROOM_REVENUE, INVENTORY, MAINTENANCE, SALARY, etc.)")
    @GetMapping("/transactions/category/{category}")
    public ResponseEntity<List<FinanceTransaction>> getTransactionsByCategory(
            @PathVariable FinanceCategory category) {
        return ResponseEntity.ok(financeService.getTransactionsByCategory(category));
    }

    @Operation(summary = "Get transactions by date range", description = "Filters transactions within an optional start and end date range")
    @GetMapping("/transactions/date-range")
    public ResponseEntity<List<FinanceTransaction>> getTransactionsBetween(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(financeService.getTransactionsBetween(startDate, endDate));
    }

    @Operation(summary = "Get financial summary", description = "Calculates total income, total expenses, net profit, and counts for a date range")
    @GetMapping("/summary")
    public ResponseEntity<FinanceSummaryResponse> getFinancialSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(financeService.getFinancialSummary(startDate, endDate));
    }
}

