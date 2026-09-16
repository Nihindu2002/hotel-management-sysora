package com.hotel.hotel_management.finance;

import java.time.LocalDate;

public record FinanceSummaryResponse(
        LocalDate startDate,
        LocalDate endDate,
        Double totalIncome,
        Double totalExpenses,
        Double netIncome
) {
}

