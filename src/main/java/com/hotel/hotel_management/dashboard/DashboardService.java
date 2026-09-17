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
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Service
public class DashboardService {

    private final RoomRepository roomRepository;
    private final ReservationRepository reservationRepository;
    private final FinanceService financeService;
    private final InventoryRepository inventoryRepository;
    private final HousekeepingRepository housekeepingRepository;
    private final MaintenanceRepository maintenanceRepository;

    public DashboardService(
            RoomRepository roomRepository,
            ReservationRepository reservationRepository,
            FinanceService financeService,
            InventoryRepository inventoryRepository,
            HousekeepingRepository housekeepingRepository,
            MaintenanceRepository maintenanceRepository) {

        this.roomRepository = roomRepository;
        this.reservationRepository = reservationRepository;
        this.financeService = financeService;
        this.inventoryRepository = inventoryRepository;
        this.housekeepingRepository = housekeepingRepository;
        this.maintenanceRepository = maintenanceRepository;
    }

    public DashboardSummary getDashboardSummary(LocalDate startDate, LocalDate endDate) {
        CompletableFuture<RoomStatistics> roomStatsFuture =
                CompletableFuture.supplyAsync(this::getRoomStatistics);
        CompletableFuture<ReservationStatistics> reservationStatsFuture =
                CompletableFuture.supplyAsync(this::getReservationStatistics);
        CompletableFuture<FinanceStatistics> financeStatsFuture =
                CompletableFuture.supplyAsync(() -> getFinanceStatistics(startDate, endDate));
        CompletableFuture<InventoryStatistics> inventoryStatsFuture =
                CompletableFuture.supplyAsync(this::getInventoryStatistics);
        CompletableFuture<HousekeepingStatistics> housekeepingStatsFuture =
                CompletableFuture.supplyAsync(this::getHousekeepingStatistics);
        CompletableFuture<MaintenanceStatistics> maintenanceStatsFuture =
                CompletableFuture.supplyAsync(this::getMaintenanceStatistics);

        CompletableFuture.allOf(
                roomStatsFuture,
                reservationStatsFuture,
                financeStatsFuture,
                inventoryStatsFuture,
                housekeepingStatsFuture,
                maintenanceStatsFuture
        ).join();

        return new DashboardSummary(
                roomStatsFuture.join(),
                reservationStatsFuture.join(),
                financeStatsFuture.join(),
                inventoryStatsFuture.join(),
                housekeepingStatsFuture.join(),
                maintenanceStatsFuture.join()
        );
    }

    public RoomStatistics getRoomStatistics() {
        List<Room> rooms = roomRepository.findAll();

        long total = rooms.size();
        long available = rooms.stream().filter(r -> r.getStatus() == RoomStatus.AVAILABLE).count();
        long reserved = rooms.stream().filter(r -> r.getStatus() == RoomStatus.RESERVED).count();
        long occupied = rooms.stream().filter(r -> r.getStatus() == RoomStatus.OCCUPIED).count();
        long cleaning = rooms.stream().filter(r -> r.getStatus() == RoomStatus.CLEANING).count();
        long maintenance = rooms.stream().filter(r -> r.getStatus() == RoomStatus.MAINTENANCE).count();

        return new RoomStatistics(total, available, reserved, occupied, cleaning, maintenance);
    }

    public OccupancyReportResponse getOccupancyReport() {
        RoomStatistics stats = getRoomStatistics();
        double rate = stats.totalRooms() > 0
                ? (stats.occupiedRooms() * 100.0 / stats.totalRooms())
                : 0.0;

        return new OccupancyReportResponse(
                stats.totalRooms(),
                stats.occupiedRooms(),
                Math.round(rate * 100.0) / 100.0
        );
    }

    public ReservationStatistics getReservationStatistics() {
        List<Reservation> reservations = reservationRepository.findAll();

        long total = reservations.size();
        long pending = reservations.stream().filter(r -> r.getStatus() == ReservationStatus.PENDING).count();
        long confirmed = reservations.stream().filter(r -> r.getStatus() == ReservationStatus.CONFIRMED).count();
        long checkedIn = reservations.stream().filter(r -> r.getStatus() == ReservationStatus.CHECKED_IN).count();
        long checkedOut = reservations.stream().filter(r -> r.getStatus() == ReservationStatus.CHECKED_OUT).count();
        long cancelled = reservations.stream().filter(r -> r.getStatus() == ReservationStatus.CANCELLED).count();

        return new ReservationStatistics(total, pending, confirmed, checkedIn, checkedOut, cancelled);
    }

    public FinanceStatistics getFinanceStatistics(LocalDate startDate, LocalDate endDate) {
        FinanceSummaryResponse summary = financeService.getFinancialSummary(startDate, endDate);
        return new FinanceStatistics(
                summary.totalIncome(),
                summary.totalExpenses(),
                summary.netIncome()
        );
    }

    public RevenueReportResponse getRevenueReport(LocalDate startDate, LocalDate endDate) {
        FinanceSummaryResponse summary = financeService.getFinancialSummary(startDate, endDate);
        return new RevenueReportResponse(startDate, endDate, summary.totalIncome());
    }

    public ExpenseReportResponse getExpenseReport(LocalDate startDate, LocalDate endDate) {
        List<FinanceTransaction> transactions = financeService.getTransactionsBetween(startDate, endDate);

        Map<FinanceCategory, Double> byCategory = new EnumMap<>(FinanceCategory.class);
        double totalExpenses = 0.0;

        for (FinanceTransaction tx : transactions) {
            if (tx.getStatus() == FinanceStatus.ACTIVE && tx.getType() == FinanceTransactionType.EXPENSE) {
                double amount = tx.getAmount() != null ? tx.getAmount() : 0.0;
                totalExpenses += amount;
                byCategory.merge(tx.getCategory(), amount, Double::sum);
            }
        }

        return new ExpenseReportResponse(startDate, endDate, totalExpenses, byCategory);
    }

    public Map<FinanceCategory, Double> getExpensesByCategory(LocalDate startDate, LocalDate endDate) {
        return getExpenseReport(startDate, endDate).expensesByCategory();
    }

    public InventoryStatistics getInventoryStatistics() {
        List<InventoryItem> items = inventoryRepository.findAll();

        long total = items.size();
        long active = items.stream().filter(i -> i.getStatus() == InventoryStatus.ACTIVE).count();
        long inactive = items.stream().filter(i -> i.getStatus() == InventoryStatus.INACTIVE).count();
        long lowStock = items.stream().filter(i ->
                i.getStatus() == InventoryStatus.ACTIVE
                        && i.getQuantity() != null
                        && i.getMinimumStock() != null
                        && i.getQuantity() <= i.getMinimumStock()
        ).count();

        return new InventoryStatistics(total, active, inactive, lowStock);
    }

    public HousekeepingStatistics getHousekeepingStatistics() {
        List<HousekeepingTask> tasks = housekeepingRepository.findAll();

        long total = tasks.size();
        long pending = tasks.stream().filter(t -> t.getStatus() == HousekeepingTaskStatus.PENDING).count();
        long assigned = tasks.stream().filter(t -> t.getStatus() == HousekeepingTaskStatus.ASSIGNED).count();
        long inProgress = tasks.stream().filter(t -> t.getStatus() == HousekeepingTaskStatus.IN_PROGRESS).count();
        long completed = tasks.stream().filter(t -> t.getStatus() == HousekeepingTaskStatus.COMPLETED).count();
        long cancelled = tasks.stream().filter(t -> t.getStatus() == HousekeepingTaskStatus.CANCELLED).count();

        return new HousekeepingStatistics(total, pending, assigned, inProgress, completed, cancelled);
    }

    public MaintenanceStatistics getMaintenanceStatistics() {
        List<MaintenanceTask> tasks = maintenanceRepository.findAll();

        long total = tasks.size();
        long pending = tasks.stream().filter(t -> t.getStatus() == MaintenanceStatus.PENDING).count();
        long assigned = tasks.stream().filter(t -> t.getStatus() == MaintenanceStatus.ASSIGNED).count();
        long inProgress = tasks.stream().filter(t -> t.getStatus() == MaintenanceStatus.IN_PROGRESS).count();
        long completed = tasks.stream().filter(t -> t.getStatus() == MaintenanceStatus.COMPLETED).count();
        long cancelled = tasks.stream().filter(t -> t.getStatus() == MaintenanceStatus.CANCELLED).count();

        return new MaintenanceStatistics(total, pending, assigned, inProgress, completed, cancelled);
    }
}

