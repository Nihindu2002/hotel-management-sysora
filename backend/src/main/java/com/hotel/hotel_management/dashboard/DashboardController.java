package com.hotel.hotel_management.dashboard;
import com.hotel.hotel_management.finance.FinanceCategory;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Tag(name = "Dashboard", description = "Management dashboard analytics, statistics, and financial/occupancy reports")
@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @Operation(summary = "Get full dashboard summary", description = "Calculates overall dashboard metrics including rooms, reservations, finance, inventory, housekeeping, and maintenance")
    @GetMapping("/summary")
    public ResponseEntity<DashboardSummary> getDashboardSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(dashboardService.getDashboardSummary(startDate, endDate));
    }

    @Operation(summary = "Get revenue report", description = "Retrieves revenue total, count, and transaction list within date range")
    @GetMapping("/revenue")
    public ResponseEntity<RevenueReportResponse> getRevenueReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(dashboardService.getRevenueReport(startDate, endDate));
    }

    @Operation(summary = "Get expense report", description = "Retrieves expenses total, count, and transaction list within date range")
    @GetMapping("/expenses")
    public ResponseEntity<ExpenseReportResponse> getExpenseReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(dashboardService.getExpenseReport(startDate, endDate));
    }

    @Operation(summary = "Get expenses grouped by category", description = "Returns breakdown of expenses categorized by type (INVENTORY, MAINTENANCE, SALARY, etc.)")
    @GetMapping("/expenses/by-category")
    public ResponseEntity<Map<FinanceCategory, Double>> getExpensesByCategory(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(dashboardService.getExpensesByCategory(startDate, endDate));
    }

    @Operation(summary = "Get revenue grouped by category", description = "Returns breakdown of revenue categorized by type (ROOM_REVENUE, FOOD_REVENUE, etc.)")
    @GetMapping("/revenue/by-category")
    public ResponseEntity<Map<FinanceCategory, Double>> getRevenueByCategory(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(dashboardService.getRevenueByCategory(startDate, endDate));
    }

    @Operation(summary = "Get revenue trend", description = "Returns revenue bucketed by DAY or MONTH across the date range, with empty buckets filled at zero")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Trend returned"),
            @ApiResponse(responseCode = "400", description = "Start date is after end date")
    })
    @GetMapping("/revenue/trend")
    public ResponseEntity<TrendResponse> getRevenueTrend(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false, defaultValue = "DAY") String groupBy) {
        return ResponseEntity.ok(dashboardService.getRevenueTrend(startDate, endDate, groupBy));
    }

    @Operation(summary = "Get expense trend", description = "Returns expenses bucketed by DAY or MONTH across the date range, with empty buckets filled at zero")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Trend returned"),
            @ApiResponse(responseCode = "400", description = "Start date is after end date")
    })
    @GetMapping("/expenses/trend")
    public ResponseEntity<TrendResponse> getExpenseTrend(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false, defaultValue = "DAY") String groupBy) {
        return ResponseEntity.ok(dashboardService.getExpenseTrend(startDate, endDate, groupBy));
    }

    @Operation(summary = "Get today's reservation activity", description = "Returns bookings created today, today's arrivals and departures, and pending/confirmed/checked-in counts")
    @GetMapping("/reservations/activity")
    public ResponseEntity<ReservationActivityResponse> getReservationActivity() {
        return ResponseEntity.ok(dashboardService.getReservationActivity());
    }

    @Operation(summary = "Get outstanding invoice totals", description = "Returns invoiced, paid, and outstanding balances across all invoices")
    @GetMapping("/invoices/outstanding")
    public ResponseEntity<InvoiceOutstandingResponse> getInvoiceOutstanding() {
        return ResponseEntity.ok(dashboardService.getInvoiceOutstanding());
    }

    @Operation(summary = "Get recent activity", description = "Returns a merged, newest-first feed of recent payments, refunds, stock receipts, maintenance costs, and reservations")
    @GetMapping("/recent-activity")
    public ResponseEntity<List<ActivityItemResponse>> getRecentActivity(
            @RequestParam(required = false) Integer limit) {
        return ResponseEntity.ok(dashboardService.getRecentActivity(limit));
    }

    @Operation(summary = "Get room occupancy report", description = "Calculates total rooms, occupied rooms, available rooms, and occupancy rate percentage")
    @GetMapping("/occupancy")
    public ResponseEntity<OccupancyReportResponse> getOccupancyReport() {
        return ResponseEntity.ok(dashboardService.getOccupancyReport());
    }

    @Operation(summary = "Get room status counts", description = "Returns total, available, reserved, occupied, cleaning, and maintenance room counts")
    @GetMapping("/rooms/statistics")
    public ResponseEntity<RoomStatistics> getRoomStatistics() {
        return ResponseEntity.ok(dashboardService.getRoomStatistics());
    }

    @Operation(summary = "Get reservation statistics", description = "Calculates counts of total, confirmed, checked-in, checked-out, and cancelled reservations")
    @GetMapping("/reservations")
    public ResponseEntity<ReservationStatistics> getReservationStatistics() {
        return ResponseEntity.ok(dashboardService.getReservationStatistics());
    }

    @Operation(summary = "Get inventory statistics", description = "Calculates total items, total units, total inventory value, and low stock count")
    @GetMapping("/inventory")
    public ResponseEntity<InventoryStatistics> getInventoryStatistics() {
        return ResponseEntity.ok(dashboardService.getInventoryStatistics());
    }

    @Operation(summary = "Get housekeeping statistics", description = "Calculates total, pending, in-progress, and completed housekeeping tasks")
    @GetMapping("/housekeeping")
    public ResponseEntity<HousekeepingStatistics> getHousekeepingStatistics() {
        return ResponseEntity.ok(dashboardService.getHousekeepingStatistics());
    }

    @Operation(summary = "Get maintenance statistics", description = "Calculates total, pending, in-progress, and completed maintenance tasks and total cost")
    @GetMapping("/maintenance")
    public ResponseEntity<MaintenanceStatistics> getMaintenanceStatistics() {
        return ResponseEntity.ok(dashboardService.getMaintenanceStatistics());
    }
}

