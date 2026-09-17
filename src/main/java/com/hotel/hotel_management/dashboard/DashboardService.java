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
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Service
public class DashboardService {

    private static final String GROUP_BY_DAY = "DAY";
    private static final String GROUP_BY_MONTH = "MONTH";

    private static final int DEFAULT_TREND_DAYS = 30;
    private static final int DEFAULT_TREND_MONTHS = 12;
    private static final int DEFAULT_ACTIVITY_LIMIT = 10;

    private final RoomRepository roomRepository;
    private final ReservationRepository reservationRepository;
    private final FinanceService financeService;
    private final InventoryRepository inventoryRepository;
    private final HousekeepingRepository housekeepingRepository;
    private final MaintenanceRepository maintenanceRepository;
    private final InvoiceRepository invoiceRepository;

    public DashboardService(
            RoomRepository roomRepository,
            ReservationRepository reservationRepository,
            FinanceService financeService,
            InventoryRepository inventoryRepository,
            HousekeepingRepository housekeepingRepository,
            MaintenanceRepository maintenanceRepository,
            InvoiceRepository invoiceRepository) {

        this.roomRepository = roomRepository;
        this.reservationRepository = reservationRepository;
        this.financeService = financeService;
        this.inventoryRepository = inventoryRepository;
        this.housekeepingRepository = housekeepingRepository;
        this.maintenanceRepository = maintenanceRepository;
        this.invoiceRepository = invoiceRepository;
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
        // Deliberately not filtered on transactionDate: a ledger row without a
        // date still counts toward the total.
        List<FinanceTransaction> expenses = financeService.getTransactionsBetween(startDate, endDate)
                .stream()
                .filter(tx -> tx.getStatus() == FinanceStatus.ACTIVE)
                .filter(tx -> tx.getType() == FinanceTransactionType.EXPENSE)
                .toList();

        double totalExpenses = expenses.stream().mapToDouble(this::amountOf).sum();

        return new ExpenseReportResponse(
                startDate, endDate, totalExpenses, groupByCategory(expenses));
    }

    public Map<FinanceCategory, Double> getExpensesByCategory(LocalDate startDate, LocalDate endDate) {
        return getExpenseReport(startDate, endDate).expensesByCategory();
    }

    public Map<FinanceCategory, Double> getRevenueByCategory(LocalDate startDate, LocalDate endDate) {
        return groupByCategory(
                activeTransactionsBetween(startDate, endDate, FinanceTransactionType.INCOME));
    }

    public TrendResponse getRevenueTrend(LocalDate startDate, LocalDate endDate, String groupBy) {
        return buildTrend(startDate, endDate, groupBy, FinanceTransactionType.INCOME);
    }

    public TrendResponse getExpenseTrend(LocalDate startDate, LocalDate endDate, String groupBy) {
        return buildTrend(startDate, endDate, groupBy, FinanceTransactionType.EXPENSE);
    }

    /**
     * Reservation figures for today. Arrivals and departures count stays
     * scheduled for today and skip cancelled bookings; the totals are all-time
     * status counts, mirroring {@link #getReservationStatistics()}.
     */
    public ReservationActivityResponse getReservationActivity() {
        List<Reservation> reservations = reservationRepository.findAll();
        LocalDate today = LocalDate.now();

        long createdToday = reservations.stream()
                .filter(r -> toLocalDate(r.getCreatedAt()) != null
                        && today.equals(toLocalDate(r.getCreatedAt())))
                .count();

        long arrivalsToday = reservations.stream()
                .filter(r -> r.getStatus() != ReservationStatus.CANCELLED)
                .filter(r -> today.equals(r.getCheckInDate()))
                .count();

        long departuresToday = reservations.stream()
                .filter(r -> r.getStatus() != ReservationStatus.CANCELLED)
                .filter(r -> today.equals(r.getCheckOutDate()))
                .count();

        long pending = reservations.stream()
                .filter(r -> r.getStatus() == ReservationStatus.PENDING)
                .count();

        long confirmed = reservations.stream()
                .filter(r -> r.getStatus() == ReservationStatus.CONFIRMED)
                .count();

        long checkedIn = reservations.stream()
                .filter(r -> r.getStatus() == ReservationStatus.CHECKED_IN)
                .count();

        return new ReservationActivityResponse(
                createdToday, arrivalsToday, departuresToday, pending, confirmed, checkedIn);
    }

    public InvoiceOutstandingResponse getInvoiceOutstanding() {
        List<Invoice> invoices = invoiceRepository.findAll();

        long total = invoices.size();
        long outstanding = 0;
        long paid = 0;
        double totalInvoiced = 0.0;
        double totalPaid = 0.0;
        double totalOutstanding = 0.0;

        for (Invoice invoice : invoices) {
            double remaining = invoice.getRemainingAmount() != null ? invoice.getRemainingAmount() : 0.0;

            totalInvoiced += invoice.getTotalAmount() != null ? invoice.getTotalAmount() : 0.0;
            totalPaid += invoice.getPaidAmount() != null ? invoice.getPaidAmount() : 0.0;

            if (remaining > 0) {
                outstanding++;
                totalOutstanding += remaining;
            } else {
                paid++;
            }
        }

        return new InvoiceOutstandingResponse(
                total, outstanding, paid, totalInvoiced, totalPaid, totalOutstanding);
    }

    /**
     * A merged feed of the most recent operational events.
     *
     * Financial movements already cover payments, refunds, stock receipts and
     * maintenance costs — every one of them writes a ledger row — so the feed is
     * those rows plus newly created reservations, newest first.
     */
    public List<ActivityItemResponse> getRecentActivity(Integer limit) {
        int capped = limit != null && limit > 0 ? Math.min(limit, 50) : DEFAULT_ACTIVITY_LIMIT;

        List<ActivityItemResponse> activity = new ArrayList<>();

        for (FinanceTransaction tx : financeService.getAllTransactions()) {
            if (tx.getStatus() != FinanceStatus.ACTIVE || tx.getCreatedAt() == null) {
                continue;
            }
            activity.add(new ActivityItemResponse(
                    activityTypeFor(tx.getReferenceType()),
                    tx.getDescription(),
                    tx.getReferenceId(),
                    tx.getCreatedAt()));
        }

        for (Reservation reservation : reservationRepository.findAll()) {
            if (reservation.getCreatedAt() == null) {
                continue;
            }
            activity.add(new ActivityItemResponse(
                    "RESERVATION",
                    "Reservation for room " + reservation.getRoomId() + " ("
                            + reservation.getCheckInDate() + " → " + reservation.getCheckOutDate() + ")",
                    reservation.getReservationId(),
                    reservation.getCreatedAt()));
        }

        return activity.stream()
                .sorted(Comparator.comparing(ActivityItemResponse::timestamp).reversed())
                .limit(capped)
                .toList();
    }

    private TrendResponse buildTrend(
            LocalDate startDate,
            LocalDate endDate,
            String groupBy,
            FinanceTransactionType type) {

        boolean monthly = GROUP_BY_MONTH.equalsIgnoreCase(groupBy);

        LocalDate resolvedEnd = endDate != null ? endDate : LocalDate.now();
        LocalDate resolvedStart;
        if (startDate != null) {
            resolvedStart = startDate;
        } else if (monthly) {
            resolvedStart = resolvedEnd.minusMonths(DEFAULT_TREND_MONTHS - 1L).withDayOfMonth(1);
        } else {
            resolvedStart = resolvedEnd.minusDays(DEFAULT_TREND_DAYS - 1L);
        }

        if (resolvedStart.isAfter(resolvedEnd)) {
            throw new IllegalArgumentException("Start date cannot be after end date");
        }

        // Pre-seed every bucket with zero so the series is continuous — a gap
        // would otherwise be drawn as a straight line between distant points.
        Map<LocalDate, Double> buckets = new LinkedHashMap<>();
        if (monthly) {
            LocalDate cursor = resolvedStart.withDayOfMonth(1);
            LocalDate last = resolvedEnd.withDayOfMonth(1);
            while (!cursor.isAfter(last)) {
                buckets.put(cursor, 0.0);
                cursor = cursor.plusMonths(1);
            }
        } else {
            LocalDate cursor = resolvedStart;
            while (!cursor.isAfter(resolvedEnd)) {
                buckets.put(cursor, 0.0);
                cursor = cursor.plusDays(1);
            }
        }

        for (FinanceTransaction tx : activeTransactionsBetween(resolvedStart, resolvedEnd, type)) {
            LocalDate bucket = monthly
                    ? tx.getTransactionDate().withDayOfMonth(1)
                    : tx.getTransactionDate();

            buckets.computeIfPresent(bucket, (key, running) -> running + amountOf(tx));
        }

        List<TrendPointResponse> points = buckets.entrySet().stream()
                .map(entry -> new TrendPointResponse(entry.getKey(), entry.getValue()))
                .toList();

        return new TrendResponse(
                resolvedStart, resolvedEnd, monthly ? GROUP_BY_MONTH : GROUP_BY_DAY, points);
    }

    private List<FinanceTransaction> activeTransactionsBetween(
            LocalDate startDate,
            LocalDate endDate,
            FinanceTransactionType type) {

        return financeService.getTransactionsBetween(startDate, endDate).stream()
                .filter(tx -> tx.getStatus() == FinanceStatus.ACTIVE)
                .filter(tx -> tx.getType() == type)
                .filter(tx -> tx.getTransactionDate() != null)
                .toList();
    }

    private Map<FinanceCategory, Double> groupByCategory(List<FinanceTransaction> transactions) {
        Map<FinanceCategory, Double> byCategory = new EnumMap<>(FinanceCategory.class);

        for (FinanceTransaction tx : transactions) {
            // A partially-applied update can leave the category null; such a row
            // still counts toward totals, it just has no bucket to sit in.
            if (tx.getCategory() == null) {
                continue;
            }
            byCategory.merge(tx.getCategory(), amountOf(tx), Double::sum);
        }

        return byCategory;
    }

    private double amountOf(FinanceTransaction transaction) {
        return transaction.getAmount() != null ? transaction.getAmount() : 0.0;
    }

    private String activityTypeFor(FinanceReferenceType referenceType) {
        if (referenceType == null) {
            return "OTHER";
        }
        return switch (referenceType) {
            case PAYMENT -> "PAYMENT";
            case PAYMENT_REFUND -> "REFUND";
            case INVENTORY, INVENTORY_TRANSACTION -> "INVENTORY";
            case MAINTENANCE, MAINTENANCE_TASK -> "MAINTENANCE";
            case STAFF, OTHER -> "OTHER";
        };
    }

    private LocalDate toLocalDate(Instant instant) {
        return instant != null ? instant.atZone(ZoneId.systemDefault()).toLocalDate() : null;
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

