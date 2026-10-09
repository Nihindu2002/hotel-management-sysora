package com.hotel.hotel_management.dashboard;

import java.time.LocalDate;

public record RevenueReportResponse(
        LocalDate startDate,
        LocalDate endDate,
        double totalRevenue
) {
}

