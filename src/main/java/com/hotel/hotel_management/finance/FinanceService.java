package com.hotel.hotel_management.finance;

import com.hotel.hotel_management.inventory.InventoryTransaction;
import com.hotel.hotel_management.maintenance.MaintenanceTask;
import com.hotel.hotel_management.payment.Payment;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class FinanceService {

    private static final Set<FinanceCategory> INCOME_CATEGORIES = Set.of(
            FinanceCategory.ROOM_REVENUE,
            FinanceCategory.FOOD_REVENUE,
            FinanceCategory.OTHER_REVENUE,
            FinanceCategory.OTHER
    );

    private static final Set<FinanceCategory> EXPENSE_CATEGORIES = Set.of(
            FinanceCategory.INVENTORY,
            FinanceCategory.SALARY,
            FinanceCategory.MAINTENANCE,
            FinanceCategory.UTILITIES,
            FinanceCategory.RENT,
            FinanceCategory.MARKETING,
            FinanceCategory.TAX,
            FinanceCategory.REFUND,
            FinanceCategory.OTHER_REVENUE,
            FinanceCategory.OTHER
    );

    private final FinanceRepository financeRepository;

    public FinanceService(FinanceRepository financeRepository) {
        this.financeRepository = financeRepository;
    }

    public FinanceTransaction createTransaction(CreateFinanceTransactionRequest request, String performedBy) {
        if (request.type() == null) {
            throw new IllegalArgumentException("Transaction type is required");
        }

        if (request.category() == null) {
            throw new IllegalArgumentException("Category is required");
        }

        validateCategory(request.type(), request.category());

        if (request.amount() == null || request.amount() <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }

        if (request.description() == null || request.description().trim().isEmpty()) {
            throw new IllegalArgumentException("Description is required");
        }

        if (request.transactionDate() == null) {
            throw new IllegalArgumentException("Transaction date is required");
        }

        Instant now = Instant.now();

        FinanceTransaction transaction = new FinanceTransaction();
        transaction.setTransactionId(UUID.randomUUID().toString());
        transaction.setType(request.type());
        transaction.setCategory(request.category());
        transaction.setAmount(request.amount());
        transaction.setDescription(request.description());
        transaction.setReferenceId(request.referenceId());
        transaction.setReferenceType(request.referenceType() != null ? request.referenceType() : FinanceReferenceType.OTHER);
        transaction.setPerformedBy(performedBy != null ? performedBy : "SYSTEM");
        transaction.setTransactionDate(request.transactionDate());
        transaction.setStatus(FinanceStatus.ACTIVE);
        transaction.setCreatedAt(now);
        transaction.setUpdatedAt(now);

        return financeRepository.save(transaction);
    }

    public FinanceTransaction updateTransaction(String transactionId, UpdateFinanceTransactionRequest request) {
        FinanceTransaction existing = getTransactionById(transactionId);

        if (request.category() != null) {
            validateCategory(existing.getType(), request.category());
        }

        return financeRepository.update(transactionId, request);
    }

    public FinanceTransaction cancelTransaction(String transactionId) {
        getTransactionById(transactionId);
        return financeRepository.updateStatus(transactionId, FinanceStatus.CANCELLED);
    }

    public FinanceTransaction getTransactionById(String transactionId) {
        return financeRepository.findById(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Finance transaction not found"));
    }

    public List<FinanceTransaction> getAllTransactions() {
        return financeRepository.findAll();
    }

    public List<FinanceTransaction> getTransactionsByType(FinanceTransactionType type) {
        if (type == null) {
            throw new IllegalArgumentException("Transaction type is required");
        }
        return financeRepository.findByType(type);
    }

    public List<FinanceTransaction> getTransactionsByCategory(FinanceCategory category) {
        if (category == null) {
            throw new IllegalArgumentException("Category is required");
        }
        return financeRepository.findByCategory(category);
    }

    public List<FinanceTransaction> getTransactionsBetween(LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Start date cannot be after end date");
        }

        return financeRepository.findAll().stream()
                .filter(t -> t.getTransactionDate() != null)
                .filter(t -> (startDate == null || !t.getTransactionDate().isBefore(startDate)))
                .filter(t -> (endDate == null || !t.getTransactionDate().isAfter(endDate)))
                .toList();
    }

    public FinanceSummaryResponse getFinancialSummary(LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Start date cannot be after end date");
        }

        List<FinanceTransaction> active = financeRepository.findAll().stream()
                .filter(t -> t.getStatus() == FinanceStatus.ACTIVE)
                .filter(t -> t.getTransactionDate() != null)
                .filter(t -> (startDate == null || !t.getTransactionDate().isBefore(startDate)))
                .filter(t -> (endDate == null || !t.getTransactionDate().isAfter(endDate)))
                .toList();

        double totalIncome = active.stream()
                .filter(t -> t.getType() == FinanceTransactionType.INCOME)
                .mapToDouble(FinanceTransaction::getAmount)
                .sum();

        double totalExpenses = active.stream()
                .filter(t -> t.getType() == FinanceTransactionType.EXPENSE)
                .mapToDouble(FinanceTransaction::getAmount)
                .sum();

        double netIncome = totalIncome - totalExpenses;

        return new FinanceSummaryResponse(startDate, endDate, totalIncome, totalExpenses, netIncome);
    }

    public FinanceTransaction recordPaymentIncome(Payment payment) {
        return recordPaymentIncome(payment, null);
    }

    public FinanceTransaction recordPaymentIncome(Payment payment, String performedBy) {
        if (payment == null || payment.getPaymentId() == null) {
            return null;
        }

        List<FinanceTransaction> existing = financeRepository.findByReferenceId(payment.getPaymentId());
        boolean alreadyExists = existing.stream()
                .anyMatch(t -> t.getStatus() == FinanceStatus.ACTIVE && t.getReferenceType() == FinanceReferenceType.PAYMENT);

        if (alreadyExists) {
            return null;
        }

        String actualPerformedBy = performedBy != null
                ? performedBy
                : (payment.getRecordedBy() != null ? payment.getRecordedBy() : "SYSTEM");

        FinanceTransaction transaction = new FinanceTransaction();
        transaction.setTransactionId(UUID.randomUUID().toString());
        transaction.setType(FinanceTransactionType.INCOME);
        transaction.setCategory(FinanceCategory.ROOM_REVENUE);
        transaction.setAmount(payment.getAmount());
        transaction.setDescription("Payment received for invoice " + payment.getInvoiceId());
        transaction.setReferenceId(payment.getPaymentId());
        transaction.setReferenceType(FinanceReferenceType.PAYMENT);
        transaction.setPerformedBy(actualPerformedBy);
        transaction.setTransactionDate(LocalDate.now());
        transaction.setStatus(FinanceStatus.ACTIVE);
        Instant now = Instant.now();
        transaction.setCreatedAt(now);
        transaction.setUpdatedAt(now);

        return financeRepository.save(transaction);
    }

    public FinanceTransaction recordPaymentRefund(Payment payment) {
        return recordPaymentRefund(payment, null);
    }

    public FinanceTransaction recordPaymentRefund(Payment payment, String performedBy) {
        if (payment == null || payment.getPaymentId() == null) {
            return null;
        }

        List<FinanceTransaction> existing = financeRepository.findByReferenceId(payment.getPaymentId());
        boolean alreadyExists = existing.stream()
                .anyMatch(t -> t.getStatus() == FinanceStatus.ACTIVE && t.getReferenceType() == FinanceReferenceType.PAYMENT_REFUND);

        if (alreadyExists) {
            return null;
        }

        String actualPerformedBy = performedBy != null
                ? performedBy
                : (payment.getRecordedBy() != null ? payment.getRecordedBy() : "SYSTEM");

        FinanceTransaction transaction = new FinanceTransaction();
        transaction.setTransactionId(UUID.randomUUID().toString());
        transaction.setType(FinanceTransactionType.EXPENSE);
        transaction.setCategory(FinanceCategory.REFUND);
        transaction.setAmount(payment.getAmount());
        transaction.setDescription("Refund for payment " + payment.getPaymentId() + " (Invoice: " + payment.getInvoiceId() + ")");
        transaction.setReferenceId(payment.getPaymentId());
        transaction.setReferenceType(FinanceReferenceType.PAYMENT_REFUND);
        transaction.setPerformedBy(actualPerformedBy);
        transaction.setTransactionDate(LocalDate.now());
        transaction.setStatus(FinanceStatus.ACTIVE);
        Instant now = Instant.now();
        transaction.setCreatedAt(now);
        transaction.setUpdatedAt(now);

        return financeRepository.save(transaction);
    }

    public FinanceTransaction recordInventoryExpense(InventoryTransaction inventoryTx) {
        if (inventoryTx == null || inventoryTx.getTransactionId() == null) {
            return null;
        }

        if (inventoryTx.getTransactionType() != null
                && inventoryTx.getTransactionType() != com.hotel.hotel_management.inventory.InventoryTransactionType.STOCK_IN) {
            return null;
        }

        double quantity = inventoryTx.getQuantity() != null ? inventoryTx.getQuantity() : 0.0;
        double unitCost = inventoryTx.getUnitCost() != null ? inventoryTx.getUnitCost() : 0.0;

        if (quantity <= 0 || unitCost <= 0) {
            return null;
        }

        double totalCost = quantity * unitCost;

        List<FinanceTransaction> existing = financeRepository.findByReferenceId(inventoryTx.getTransactionId());
        boolean alreadyExists = existing.stream()
                .anyMatch(t -> t.getStatus() == FinanceStatus.ACTIVE &&
                        (t.getReferenceType() == FinanceReferenceType.INVENTORY_TRANSACTION
                                || t.getReferenceType() == FinanceReferenceType.INVENTORY));

        if (alreadyExists) {
            return null;
        }

        FinanceTransaction transaction = new FinanceTransaction();
        transaction.setTransactionId(UUID.randomUUID().toString());
        transaction.setType(FinanceTransactionType.EXPENSE);
        transaction.setCategory(FinanceCategory.INVENTORY);
        transaction.setAmount(totalCost);
        transaction.setDescription("Inventory stock-in purchase: " + (inventoryTx.getReference() != null ? inventoryTx.getReference() : inventoryTx.getTransactionId()));
        transaction.setReferenceId(inventoryTx.getTransactionId());
        transaction.setReferenceType(FinanceReferenceType.INVENTORY_TRANSACTION);
        transaction.setPerformedBy(inventoryTx.getPerformedBy() != null ? inventoryTx.getPerformedBy() : "SYSTEM");
        transaction.setTransactionDate(LocalDate.now());
        transaction.setStatus(FinanceStatus.ACTIVE);
        Instant now = Instant.now();
        transaction.setCreatedAt(now);
        transaction.setUpdatedAt(now);

        return financeRepository.save(transaction);
    }

    public FinanceTransaction recordMaintenanceExpense(MaintenanceTask task) {
        return recordMaintenanceExpense(task, null);
    }

    public FinanceTransaction recordMaintenanceExpense(MaintenanceTask task, String performedBy) {
        if (task == null || task.getTaskId() == null) {
            return null;
        }

        Double actualCost = task.getActualCost();
        if (actualCost == null || actualCost <= 0) {
            return null;
        }

        List<FinanceTransaction> existing = financeRepository.findByReferenceId(task.getTaskId());
        boolean alreadyExists = existing.stream()
                .anyMatch(t -> t.getStatus() == FinanceStatus.ACTIVE &&
                        (t.getReferenceType() == FinanceReferenceType.MAINTENANCE_TASK
                                || t.getReferenceType() == FinanceReferenceType.MAINTENANCE));

        if (alreadyExists) {
            return null;
        }

        String actualPerformedBy = performedBy != null ? performedBy : (task.getReportedBy() != null ? task.getReportedBy() : "SYSTEM");

        FinanceTransaction transaction = new FinanceTransaction();
        transaction.setTransactionId(UUID.randomUUID().toString());
        transaction.setType(FinanceTransactionType.EXPENSE);
        transaction.setCategory(FinanceCategory.MAINTENANCE);
        transaction.setAmount(actualCost);
        transaction.setDescription("Maintenance expense for room " + task.getRoomId() + ": "
                + (task.getDescription() != null ? task.getDescription() : task.getIssueType()));
        transaction.setReferenceId(task.getTaskId());
        transaction.setReferenceType(FinanceReferenceType.MAINTENANCE_TASK);
        transaction.setPerformedBy(actualPerformedBy);
        transaction.setTransactionDate(LocalDate.now());
        transaction.setStatus(FinanceStatus.ACTIVE);
        Instant now = Instant.now();
        transaction.setCreatedAt(now);
        transaction.setUpdatedAt(now);

        return financeRepository.save(transaction);
    }

    public FinanceTransaction updateMaintenanceExpense(MaintenanceTask task, Double newCost, String performedBy) {
        if (task == null || task.getTaskId() == null) {
            return null;
        }

        List<FinanceTransaction> existing = financeRepository.findByReferenceId(task.getTaskId()).stream()
                .filter(t -> t.getStatus() == FinanceStatus.ACTIVE &&
                        (t.getReferenceType() == FinanceReferenceType.MAINTENANCE_TASK
                                || t.getReferenceType() == FinanceReferenceType.MAINTENANCE))
                .toList();

        if (existing.isEmpty()) {
            if (newCost != null && newCost > 0) {
                task.setActualCost(newCost);
                return recordMaintenanceExpense(task, performedBy);
            }
            return null;
        }

        FinanceTransaction tx = existing.get(0);

        if (newCost == null || newCost <= 0) {
            return financeRepository.updateStatus(tx.getTransactionId(), FinanceStatus.CANCELLED);
        }

        return financeRepository.updateAmount(tx.getTransactionId(), newCost);
    }

    public FinanceTransaction cancelMaintenanceExpense(String maintenanceTaskId) {
        if (maintenanceTaskId == null) {
            return null;
        }

        List<FinanceTransaction> existing = financeRepository.findByReferenceId(maintenanceTaskId).stream()
                .filter(t -> t.getStatus() == FinanceStatus.ACTIVE &&
                        (t.getReferenceType() == FinanceReferenceType.MAINTENANCE_TASK
                                || t.getReferenceType() == FinanceReferenceType.MAINTENANCE))
                .toList();

        if (existing.isEmpty()) {
            return null;
        }

        FinanceTransaction tx = existing.get(0);
        return financeRepository.updateStatus(tx.getTransactionId(), FinanceStatus.CANCELLED);
    }

    private void validateCategory(FinanceTransactionType type, FinanceCategory category) {
        if (type == FinanceTransactionType.INCOME && !INCOME_CATEGORIES.contains(category)) {
            throw new IllegalArgumentException("Invalid category for income transaction: " + category);
        }
        if (type == FinanceTransactionType.EXPENSE && !EXPENSE_CATEGORIES.contains(category)) {
            throw new IllegalArgumentException("Invalid category for expense transaction: " + category);
        }
    }
}

