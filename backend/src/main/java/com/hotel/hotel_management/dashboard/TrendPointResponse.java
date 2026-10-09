package com.hotel.hotel_management.dashboard;

import java.time.LocalDate;

/**
 * One bucket of a trend series. {@code periodStart} is the first day of the
 * bucket — a single day when grouping by DAY, the first of the month when
 * grouping by MONTH. Buckets with no activity are returned with an amount of
 * zero so the series stays continuous and charts plot a true timeline.
 */
public record TrendPointResponse(
        LocalDate periodStart,
        double amount
) {
}
