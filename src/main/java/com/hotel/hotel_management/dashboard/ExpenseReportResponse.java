package com.hotel.hotel_management.dashboard;

import com.hotel.hotel_management.finance.FinanceCategory;

import java.time.LocalDate;
import java.util.Map;

public record ExpenseReportResponse(
        LocalDate startDate,
        LocalDate endDate,
        double totalExpenses,
        Map<FinanceCategory, Double> expensesByCategory
) {
}

