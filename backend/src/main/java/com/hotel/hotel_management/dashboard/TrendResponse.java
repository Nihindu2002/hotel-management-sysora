package com.hotel.hotel_management.dashboard;

import java.time.LocalDate;
import java.util.List;

/**
 * A time series of income or expenses, bucketed by day or month.
 *
 * {@code groupBy} is {@code DAY} or {@code MONTH}. Either bound may be null when
 * the caller sent no range, in which case the service applies a default window
 * (30 days, or 12 months when grouping by month).
 */
public record TrendResponse(
        LocalDate startDate,
        LocalDate endDate,
        String groupBy,
        List<TrendPointResponse> points
) {
}
