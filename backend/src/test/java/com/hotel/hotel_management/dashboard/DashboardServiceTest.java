package com.hotel.hotel_management.dashboard;

import com.hotel.hotel_management.finance.FinanceCategory;
import com.hotel.hotel_management.finance.FinanceReferenceType;
import com.hotel.hotel_management.finance.FinanceService;
import com.hotel.hotel_management.finance.FinanceStatus;
import com.hotel.hotel_management.finance.FinanceSummaryResponse;
import com.hotel.hotel_management.finance.FinanceTransaction;
import com.hotel.hotel_management.finance.FinanceTransactionType;
import com.hotel.hotel_management.housekeeping.HousekeepingRepository;
import com.hotel.hotel_management.housekeeping.HousekeepingTask;
import com.hotel.hotel_management.housekeeping.HousekeepingTaskStatus;
import com.hotel.hotel_management.inventory.InventoryItem;
import com.hotel.hotel_management.inventory.InventoryRepository;
import com.hotel.hotel_management.inventory.InventoryStatus;
import com.hotel.hotel_management.invoice.Invoice;
import com.hotel.hotel_management.invoice.InvoiceRepository;
import com.hotel.hotel_management.maintenance.MaintenanceRepository;
import com.hotel.hotel_management.maintenance.MaintenanceStatus;
import com.hotel.hotel_management.maintenance.MaintenanceTask;
import com.hotel.hotel_management.reservation.Reservation;
import com.hotel.hotel_management.reservation.ReservationRepository;
import com.hotel.hotel_management.reservation.ReservationStatus;
import com.hotel.hotel_management.room.Room;
import com.hotel.hotel_management.room.RoomRepository;
import com.hotel.hotel_management.room.RoomStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DashboardServiceTest {

    private RoomRepository roomRepository;
    private ReservationRepository reservationRepository;
    private FinanceService financeService;
    private InventoryRepository inventoryRepository;
    private HousekeepingRepository housekeepingRepository;
    private MaintenanceRepository maintenanceRepository;
    private InvoiceRepository invoiceRepository;
    private DashboardService dashboardService;

    @BeforeEach
    void setUp() {
        roomRepository = mock(RoomRepository.class);
        reservationRepository = mock(ReservationRepository.class);
        financeService = mock(FinanceService.class);
        inventoryRepository = mock(InventoryRepository.class);
        housekeepingRepository = mock(HousekeepingRepository.class);
        maintenanceRepository = mock(MaintenanceRepository.class);
        invoiceRepository = mock(InvoiceRepository.class);

        dashboardService = new DashboardService(
                roomRepository,
                reservationRepository,
                financeService,
                inventoryRepository,
                housekeepingRepository,
                maintenanceRepository,
                invoiceRepository
        );
    }

    @Test
    void getRoomStatistics_CalculatesCountsCorrectly() {
        Room r1 = new Room(); r1.setStatus(RoomStatus.AVAILABLE);
        Room r2 = new Room(); r2.setStatus(RoomStatus.AVAILABLE);
        Room r3 = new Room(); r3.setStatus(RoomStatus.OCCUPIED);
        Room r4 = new Room(); r4.setStatus(RoomStatus.RESERVED);
        Room r5 = new Room(); r5.setStatus(RoomStatus.CLEANING);
        Room r6 = new Room(); r6.setStatus(RoomStatus.MAINTENANCE);

        when(roomRepository.findAll()).thenReturn(List.of(r1, r2, r3, r4, r5, r6));

        RoomStatistics stats = dashboardService.getRoomStatistics();
        assertEquals(6, stats.totalRooms());
        assertEquals(2, stats.availableRooms());
        assertEquals(1, stats.reservedRooms());
        assertEquals(1, stats.occupiedRooms());
        assertEquals(1, stats.cleaningRooms());
        assertEquals(1, stats.maintenanceRooms());
    }

    @Test
    void getOccupancyReport_CalculatesRateCorrectly() {
        Room r1 = new Room(); r1.setStatus(RoomStatus.OCCUPIED);
        Room r2 = new Room(); r2.setStatus(RoomStatus.OCCUPIED);
        Room r3 = new Room(); r3.setStatus(RoomStatus.AVAILABLE);
        Room r4 = new Room(); r4.setStatus(RoomStatus.AVAILABLE);

        when(roomRepository.findAll()).thenReturn(List.of(r1, r2, r3, r4));

        OccupancyReportResponse occupancy = dashboardService.getOccupancyReport();
        assertEquals(4, occupancy.totalRooms());
        assertEquals(2, occupancy.occupiedRooms());
        assertEquals(50.0, occupancy.occupancyRate());
    }

    @Test
    void getOccupancyReport_ZeroRooms_HandlesGracefully() {
        when(roomRepository.findAll()).thenReturn(List.of());

        OccupancyReportResponse occupancy = dashboardService.getOccupancyReport();
        assertEquals(0, occupancy.totalRooms());
        assertEquals(0, occupancy.occupiedRooms());
        assertEquals(0.0, occupancy.occupancyRate());
    }

    @Test
    void getReservationStatistics_CalculatesCountsCorrectly() {
        Reservation res1 = new Reservation(); res1.setStatus(ReservationStatus.PENDING);
        Reservation res2 = new Reservation(); res2.setStatus(ReservationStatus.CONFIRMED);
        Reservation res3 = new Reservation(); res3.setStatus(ReservationStatus.CHECKED_IN);
        Reservation res4 = new Reservation(); res4.setStatus(ReservationStatus.CHECKED_OUT);
        Reservation res5 = new Reservation(); res5.setStatus(ReservationStatus.CANCELLED);

        when(reservationRepository.findAll()).thenReturn(List.of(res1, res2, res3, res4, res5));

        ReservationStatistics stats = dashboardService.getReservationStatistics();
        assertEquals(5, stats.totalReservations());
        assertEquals(1, stats.pendingReservations());
        assertEquals(1, stats.confirmedReservations());
        assertEquals(1, stats.checkedInReservations());
        assertEquals(1, stats.checkedOutReservations());
        assertEquals(1, stats.cancelledReservations());
    }

    @Test
    void getInventoryStatistics_IdentifiesLowStockItems() {
        InventoryItem item1 = new InventoryItem();
        item1.setStatus(InventoryStatus.ACTIVE);
        item1.setQuantity(5.0);
        item1.setMinimumStock(10.0); // low stock!

        InventoryItem item2 = new InventoryItem();
        item2.setStatus(InventoryStatus.ACTIVE);
        item2.setQuantity(50.0);
        item2.setMinimumStock(10.0);

        InventoryItem item3 = new InventoryItem();
        item3.setStatus(InventoryStatus.INACTIVE);
        item3.setQuantity(2.0);
        item3.setMinimumStock(10.0); // inactive, should not count towards active low stock

        when(inventoryRepository.findAll()).thenReturn(List.of(item1, item2, item3));

        InventoryStatistics stats = dashboardService.getInventoryStatistics();
        assertEquals(3, stats.totalItems());
        assertEquals(2, stats.activeItems());
        assertEquals(1, stats.inactiveItems());
        assertEquals(1, stats.lowStockItems());
    }

    @Test
    void getHousekeepingStatistics_CalculatesCounts() {
        HousekeepingTask t1 = new HousekeepingTask(); t1.setStatus(HousekeepingTaskStatus.PENDING);
        HousekeepingTask t2 = new HousekeepingTask(); t2.setStatus(HousekeepingTaskStatus.ASSIGNED);
        HousekeepingTask t3 = new HousekeepingTask(); t3.setStatus(HousekeepingTaskStatus.IN_PROGRESS);
        HousekeepingTask t4 = new HousekeepingTask(); t4.setStatus(HousekeepingTaskStatus.COMPLETED);
        HousekeepingTask t5 = new HousekeepingTask(); t5.setStatus(HousekeepingTaskStatus.CANCELLED);

        when(housekeepingRepository.findAll()).thenReturn(List.of(t1, t2, t3, t4, t5));

        HousekeepingStatistics stats = dashboardService.getHousekeepingStatistics();
        assertEquals(5, stats.totalTasks());
        assertEquals(1, stats.pendingTasks());
        assertEquals(1, stats.assignedTasks());
        assertEquals(1, stats.inProgressTasks());
        assertEquals(1, stats.completedTasks());
        assertEquals(1, stats.cancelledTasks());
    }

    @Test
    void getMaintenanceStatistics_CalculatesCounts() {
        MaintenanceTask t1 = new MaintenanceTask(); t1.setStatus(MaintenanceStatus.PENDING);
        MaintenanceTask t2 = new MaintenanceTask(); t2.setStatus(MaintenanceStatus.COMPLETED);

        when(maintenanceRepository.findAll()).thenReturn(List.of(t1, t2));

        MaintenanceStatistics stats = dashboardService.getMaintenanceStatistics();
        assertEquals(2, stats.totalTasks());
        assertEquals(1, stats.pendingTasks());
        assertEquals(1, stats.completedTasks());
        assertEquals(0, stats.inProgressTasks());
    }

    @Test
    void getExpenseReport_GroupsByCategory() {
        FinanceTransaction tx1 = new FinanceTransaction();
        tx1.setStatus(FinanceStatus.ACTIVE);
        tx1.setType(FinanceTransactionType.EXPENSE);
        tx1.setCategory(FinanceCategory.INVENTORY);
        tx1.setAmount(50000.0);

        FinanceTransaction tx2 = new FinanceTransaction();
        tx2.setStatus(FinanceStatus.ACTIVE);
        tx2.setType(FinanceTransactionType.EXPENSE);
        tx2.setCategory(FinanceCategory.INVENTORY);
        tx2.setAmount(25000.0);

        FinanceTransaction tx3 = new FinanceTransaction();
        tx3.setStatus(FinanceStatus.ACTIVE);
        tx3.setType(FinanceTransactionType.EXPENSE);
        tx3.setCategory(FinanceCategory.MAINTENANCE);
        tx3.setAmount(30000.0);

        when(financeService.getTransactionsBetween(null, null))
                .thenReturn(List.of(tx1, tx2, tx3));

        ExpenseReportResponse report = dashboardService.getExpenseReport(null, null);
        assertEquals(105000.0, report.totalExpenses());
        assertEquals(75000.0, report.expensesByCategory().get(FinanceCategory.INVENTORY));
        assertEquals(30000.0, report.expensesByCategory().get(FinanceCategory.MAINTENANCE));
    }

    @Test
    void getDashboardSummary_AggregatesAllSections() {
        when(roomRepository.findAll()).thenReturn(List.of());
        when(reservationRepository.findAll()).thenReturn(List.of());
        when(financeService.getFinancialSummary(null, null))
                .thenReturn(new FinanceSummaryResponse(null, null, 100000.0, 30000.0, 70000.0));
        when(inventoryRepository.findAll()).thenReturn(List.of());
        when(housekeepingRepository.findAll()).thenReturn(List.of());
        when(maintenanceRepository.findAll()).thenReturn(List.of());

        DashboardSummary summary = dashboardService.getDashboardSummary(null, null);
        assertNotNull(summary);
        assertNotNull(summary.roomStatistics());
        assertNotNull(summary.reservationStatistics());
        assertNotNull(summary.financeStatistics());
        assertNotNull(summary.inventoryStatistics());
        assertNotNull(summary.housekeepingStatistics());
        assertNotNull(summary.maintenanceStatistics());

        assertEquals(100000.0, summary.financeStatistics().totalIncome());
        assertEquals(30000.0, summary.financeStatistics().totalExpenses());
        assertEquals(70000.0, summary.financeStatistics().netIncome());
    }

    // ── Report endpoints added for Step 45 ──

    @Test
    void getRevenueTrend_FillsEmptyBucketsWithZero() {
        when(financeService.getTransactionsBetween(LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 5)))
                .thenReturn(List.of(incomeOn(LocalDate.of(2026, 9, 2), 5000.0)));

        TrendResponse trend = dashboardService.getRevenueTrend(
                LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 5), "DAY");

        assertEquals("DAY", trend.groupBy());
        assertEquals(5, trend.points().size());
        assertEquals(0.0, trend.points().get(0).amount());
        assertEquals(5000.0, trend.points().get(1).amount());
        assertEquals(LocalDate.of(2026, 9, 1), trend.points().get(0).periodStart());
    }

    @Test
    void getRevenueTrend_GroupsByMonth() {
        when(financeService.getTransactionsBetween(LocalDate.of(2026, 7, 1), LocalDate.of(2026, 9, 30)))
                .thenReturn(List.of(
                        incomeOn(LocalDate.of(2026, 7, 15), 1000.0),
                        incomeOn(LocalDate.of(2026, 7, 28), 500.0),
                        incomeOn(LocalDate.of(2026, 9, 3), 2000.0)));

        TrendResponse trend = dashboardService.getRevenueTrend(
                LocalDate.of(2026, 7, 1), LocalDate.of(2026, 9, 30), "MONTH");

        assertEquals("MONTH", trend.groupBy());
        assertEquals(3, trend.points().size());
        assertEquals(1500.0, trend.points().get(0).amount());
        assertEquals(0.0, trend.points().get(1).amount());
        assertEquals(2000.0, trend.points().get(2).amount());
    }

    @Test
    void getRevenueTrend_IgnoresCancelledAndExpenseRows() {
        FinanceTransaction cancelled = incomeOn(LocalDate.of(2026, 9, 1), 9000.0);
        cancelled.setStatus(FinanceStatus.CANCELLED);

        FinanceTransaction expense = incomeOn(LocalDate.of(2026, 9, 1), 4000.0);
        expense.setType(FinanceTransactionType.EXPENSE);

        when(financeService.getTransactionsBetween(LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 1)))
                .thenReturn(List.of(cancelled, expense));

        TrendResponse trend = dashboardService.getRevenueTrend(
                LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 1), "DAY");

        assertEquals(1, trend.points().size());
        assertEquals(0.0, trend.points().get(0).amount());
    }

    @Test
    void getRevenueTrend_RejectsInvertedRange() {
        assertThrows(IllegalArgumentException.class, () -> dashboardService.getRevenueTrend(
                LocalDate.of(2026, 9, 10), LocalDate.of(2026, 9, 1), "DAY"));
    }

    @Test
    void getRevenueByCategory_GroupsIncomeAndSkipsCancelled() {
        FinanceTransaction cancelled = incomeOn(LocalDate.of(2026, 9, 1), 700.0);
        cancelled.setStatus(FinanceStatus.CANCELLED);

        FinanceTransaction rooms = incomeOn(LocalDate.of(2026, 9, 1), 8000.0);
        rooms.setCategory(FinanceCategory.ROOM_REVENUE);

        FinanceTransaction food = incomeOn(LocalDate.of(2026, 9, 2), 2000.0);
        food.setCategory(FinanceCategory.FOOD_REVENUE);

        when(financeService.getTransactionsBetween(null, null))
                .thenReturn(List.of(cancelled, rooms, food));

        Map<FinanceCategory, Double> byCategory = dashboardService.getRevenueByCategory(null, null);

        assertEquals(8000.0, byCategory.get(FinanceCategory.ROOM_REVENUE));
        assertEquals(2000.0, byCategory.get(FinanceCategory.FOOD_REVENUE));
    }

    @Test
    void getReservationActivity_SeparatesArrivalsDeparturesAndCancellations() {
        LocalDate today = LocalDate.now();
        Reservation arriving = reservationOn(today, today.plusDays(2), ReservationStatus.CONFIRMED);
        Reservation departing = reservationOn(today.minusDays(3), today, ReservationStatus.CHECKED_IN);
        Reservation cancelledArrival = reservationOn(today, today.plusDays(1), ReservationStatus.CANCELLED);
        Reservation pending = reservationOn(today.plusDays(5), today.plusDays(8), ReservationStatus.PENDING);

        when(reservationRepository.findAll())
                .thenReturn(List.of(arriving, departing, cancelledArrival, pending));

        ReservationActivityResponse activity = dashboardService.getReservationActivity();

        // Only `arriving` checks in today; the cancelled booking is excluded and
        // `departing` checks in three days ago.
        assertEquals(1, activity.todayArrivals());
        assertEquals(1, activity.todayDepartures());
        assertEquals(1, activity.pendingReservations());
        assertEquals(1, activity.confirmedReservations());
        assertEquals(1, activity.currentlyCheckedIn());
    }

    @Test
    void getInvoiceOutstanding_SplitsPaidFromOutstanding() {
        when(invoiceRepository.findAll()).thenReturn(List.of(
                invoice(10000.0, 10000.0, 0.0),
                invoice(20000.0, 5000.0, 15000.0),
                invoice(4000.0, 0.0, 4000.0)));

        InvoiceOutstandingResponse outstanding = dashboardService.getInvoiceOutstanding();

        assertEquals(3, outstanding.totalInvoices());
        assertEquals(2, outstanding.outstandingInvoices());
        assertEquals(1, outstanding.paidInvoices());
        assertEquals(34000.0, outstanding.totalInvoiced());
        assertEquals(15000.0, outstanding.totalPaid());
        assertEquals(19000.0, outstanding.totalOutstanding());
    }

    @Test
    void getRecentActivity_MergesSourcesNewestFirstAndRespectsLimit() {
        FinanceTransaction older = incomeOn(LocalDate.of(2026, 9, 1), 100.0);
        older.setReferenceType(FinanceReferenceType.PAYMENT);
        older.setCreatedAt(Instant.parse("2026-09-01T08:00:00Z"));

        FinanceTransaction newer = incomeOn(LocalDate.of(2026, 9, 2), 200.0);
        newer.setReferenceType(FinanceReferenceType.INVENTORY_TRANSACTION);
        newer.setCreatedAt(Instant.parse("2026-09-02T08:00:00Z"));

        Reservation reservation = reservationOn(
                LocalDate.now(), LocalDate.now().plusDays(1), ReservationStatus.PENDING);
        reservation.setCreatedAt(Instant.parse("2026-09-03T08:00:00Z"));

        when(financeService.getAllTransactions()).thenReturn(List.of(older, newer));
        when(reservationRepository.findAll()).thenReturn(List.of(reservation));

        List<ActivityItemResponse> activity = dashboardService.getRecentActivity(2);

        assertEquals(2, activity.size());
        assertEquals("RESERVATION", activity.get(0).activityType());
        assertEquals("INVENTORY", activity.get(1).activityType());
    }

    @Test
    void getRecentActivity_SkipsCancelledTransactions() {
        FinanceTransaction cancelled = incomeOn(LocalDate.of(2026, 9, 1), 100.0);
        cancelled.setStatus(FinanceStatus.CANCELLED);
        cancelled.setCreatedAt(Instant.parse("2026-09-01T08:00:00Z"));

        when(financeService.getAllTransactions()).thenReturn(List.of(cancelled));
        when(reservationRepository.findAll()).thenReturn(List.of());

        assertEquals(0, dashboardService.getRecentActivity(null).size());
    }

    private FinanceTransaction incomeOn(LocalDate date, double amount) {
        FinanceTransaction tx = new FinanceTransaction();
        tx.setTransactionId("tx-" + date + "-" + amount);
        tx.setStatus(FinanceStatus.ACTIVE);
        tx.setType(FinanceTransactionType.INCOME);
        tx.setCategory(FinanceCategory.ROOM_REVENUE);
        tx.setAmount(amount);
        tx.setTransactionDate(date);
        return tx;
    }

    private Reservation reservationOn(LocalDate checkIn, LocalDate checkOut, ReservationStatus status) {
        Reservation reservation = new Reservation();
        reservation.setReservationId("res-" + checkIn + "-" + status);
        reservation.setRoomId("room-1");
        reservation.setCheckInDate(checkIn);
        reservation.setCheckOutDate(checkOut);
        reservation.setStatus(status);
        return reservation;
    }

    private Invoice invoice(double total, double paid, double remaining) {
        Invoice invoice = new Invoice();
        invoice.setTotalAmount(total);
        invoice.setPaidAmount(paid);
        invoice.setRemainingAmount(remaining);
        return invoice;
    }
}

