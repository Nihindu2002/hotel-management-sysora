package com.hotel.hotel_management.finance;

import java.time.LocalDate;

public record CreateFinanceTransactionRequest(
        FinanceTransactionType type,
        FinanceCategory category,
        Double amount,
        String description,
        String referenceId,
        FinanceReferenceType referenceType,
        LocalDate transactionDate
) {
}

