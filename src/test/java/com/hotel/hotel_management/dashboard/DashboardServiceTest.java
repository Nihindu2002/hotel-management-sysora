package com.hotel.hotel_management.dashboard;

import com.hotel.hotel_management.finance.FinanceCategory;
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

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DashboardServiceTest {

    private RoomRepository roomRepository;
    private ReservationRepository reservationRepository;
    private FinanceService financeService;
    private InventoryRepository inventoryRepository;
    private HousekeepingRepository housekeepingRepository;
    private MaintenanceRepository maintenanceRepository;
    private DashboardService dashboardService;

    @BeforeEach
    void setUp() {
        roomRepository = mock(RoomRepository.class);
        reservationRepository = mock(ReservationRepository.class);
        financeService = mock(FinanceService.class);
        inventoryRepository = mock(InventoryRepository.class);
        housekeepingRepository = mock(HousekeepingRepository.class);
        maintenanceRepository = mock(MaintenanceRepository.class);

        dashboardService = new DashboardService(
                roomRepository,
                reservationRepository,
                financeService,
                inventoryRepository,
                housekeepingRepository,
                maintenanceRepository
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
}

