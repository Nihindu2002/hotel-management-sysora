package com.hotel.hotel_management.finance;

import java.time.LocalDate;

public record UpdateFinanceTransactionRequest(
        FinanceCategory category,
        String description,
        LocalDate transactionDate
) {
}

