package com.hotel.hotel_management.inventory;

import com.hotel.hotel_management.finance.FinanceService;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final FinanceService financeService;

    public InventoryService(
            InventoryRepository inventoryRepository,
            InventoryTransactionRepository inventoryTransactionRepository,
            FinanceService financeService) {

        this.inventoryRepository = inventoryRepository;
        this.inventoryTransactionRepository = inventoryTransactionRepository;
        this.financeService = financeService;
    }

    public InventoryItem createItem(CreateInventoryItemRequest request) {

        if (request.minimumStock() < 0) {
            throw new IllegalArgumentException("Minimum stock cannot be negative");
        }

        if (request.unitCost() < 0) {
            throw new IllegalArgumentException("Unit cost cannot be negative");
        }

        Instant now = Instant.now();

        InventoryItem item = new InventoryItem();
        item.setItemId(UUID.randomUUID().toString());
        item.setItemName(request.itemName());
        item.setCategory(request.category());
        item.setDescription(request.description());
        item.setUnit(request.unit());
        item.setQuantity(0.0);
        item.setMinimumStock(request.minimumStock());
        item.setUnitCost(request.unitCost());
        item.setSupplierId(request.supplierId());
        item.setStatus(InventoryStatus.ACTIVE);
        item.setCreatedAt(now);
        item.setUpdatedAt(now);

        return inventoryRepository.save(item);
    }

    public InventoryItem getItemById(String itemId) {

        return inventoryRepository.findById(itemId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Inventory item not found"));
    }

    public List<InventoryItem> getAllItems() {
        return inventoryRepository.findAll();
    }

    public List<InventoryItem> getLowStockItems() {

        return inventoryRepository.findAll().stream()
                .filter(item ->
                        item.getStatus() == InventoryStatus.ACTIVE
                                && item.getQuantity() <= item.getMinimumStock())
                .collect(Collectors.toList());
    }

    public InventoryItem updateItem(String itemId, UpdateInventoryItemRequest request) {

        getItemById(itemId);

        if (request.minimumStock() < 0) {
            throw new IllegalArgumentException("Minimum stock cannot be negative");
        }

        if (request.unitCost() < 0) {
            throw new IllegalArgumentException("Unit cost cannot be negative");
        }

        return inventoryRepository.update(itemId, request);
    }

    public InventoryItem deactivateItem(String itemId) {

        getItemById(itemId);

        return inventoryRepository.updateStatus(itemId, InventoryStatus.INACTIVE);
    }

    public InventoryTransaction stockIn(StockInRequest request, String performedBy) {

        InventoryItem item = getItemById(request.itemId());

        if (item.getStatus() == InventoryStatus.INACTIVE) {
            throw new IllegalArgumentException("Cannot receive stock for inactive item");
        }

        if (request.quantity() <= 0) {
            throw new IllegalArgumentException("Stock-in quantity must be greater than zero");
        }

        if (request.unitCost() != null && request.unitCost() < 0) {
            throw new IllegalArgumentException("Unit cost cannot be negative");
        }

        double previousQuantity = item.getQuantity() != null ? item.getQuantity() : 0.0;
        double newQuantity = previousQuantity + request.quantity();

        inventoryRepository.updateQuantity(item.getItemId(), newQuantity);

        Instant now = Instant.now();

        InventoryTransaction transaction = new InventoryTransaction();
        transaction.setTransactionId(UUID.randomUUID().toString());
        transaction.setItemId(item.getItemId());
        transaction.setTransactionType(InventoryTransactionType.STOCK_IN);
        transaction.setQuantity(request.quantity());
        transaction.setPreviousQuantity(previousQuantity);
        transaction.setNewQuantity(newQuantity);
        transaction.setUnitCost(request.unitCost() != null ? request.unitCost() : item.getUnitCost());
        transaction.setReference(request.reference());
        transaction.setPerformedBy(performedBy);
        transaction.setNotes(request.notes());
        transaction.setCreatedAt(now);

        InventoryTransaction savedTransaction = inventoryTransactionRepository.save(transaction);

        financeService.recordInventoryExpense(savedTransaction);

        return savedTransaction;
    }

    public InventoryTransaction stockOut(StockOutRequest request, String performedBy) {

        InventoryItem item = getItemById(request.itemId());

        if (item.getStatus() == InventoryStatus.INACTIVE) {
            throw new IllegalArgumentException("Cannot issue stock for inactive item");
        }

        if (request.quantity() <= 0) {
            throw new IllegalArgumentException("Stock-out quantity must be greater than zero");
        }

        double previousQuantity = item.getQuantity() != null ? item.getQuantity() : 0.0;

        if (request.quantity() > previousQuantity) {
            throw new IllegalArgumentException(
                    "Insufficient stock available: requested " + request.quantity() + ", available " + previousQuantity);
        }

        double newQuantity = previousQuantity - request.quantity();

        inventoryRepository.updateQuantity(item.getItemId(), newQuantity);

        Instant now = Instant.now();

        InventoryTransaction transaction = new InventoryTransaction();
        transaction.setTransactionId(UUID.randomUUID().toString());
        transaction.setItemId(item.getItemId());
        transaction.setTransactionType(InventoryTransactionType.STOCK_OUT);
        transaction.setQuantity(request.quantity());
        transaction.setPreviousQuantity(previousQuantity);
        transaction.setNewQuantity(newQuantity);
        transaction.setUnitCost(item.getUnitCost());
        transaction.setReference(request.reference());
        transaction.setPerformedBy(performedBy);
        transaction.setNotes(request.notes());
        transaction.setCreatedAt(now);

        return inventoryTransactionRepository.save(transaction);
    }

    public InventoryTransaction adjustStock(InventoryAdjustmentRequest request, String performedBy) {

        InventoryItem item = getItemById(request.itemId());

        if (item.getStatus() == InventoryStatus.INACTIVE) {
            throw new IllegalArgumentException("Cannot adjust stock for inactive item");
        }

        if (request.newQuantity() < 0) {
            throw new IllegalArgumentException("Quantity cannot be negative");
        }

        double previousQuantity = item.getQuantity() != null ? item.getQuantity() : 0.0;
        double newQuantity = request.newQuantity();

        inventoryRepository.updateQuantity(item.getItemId(), newQuantity);

        Instant now = Instant.now();

        InventoryTransaction transaction = new InventoryTransaction();
        transaction.setTransactionId(UUID.randomUUID().toString());
        transaction.setItemId(item.getItemId());
        transaction.setTransactionType(InventoryTransactionType.ADJUSTMENT);
        transaction.setQuantity(Math.abs(newQuantity - previousQuantity));
        transaction.setPreviousQuantity(previousQuantity);
        transaction.setNewQuantity(newQuantity);
        transaction.setUnitCost(item.getUnitCost());
        transaction.setReference("ADJUSTMENT");
        transaction.setPerformedBy(performedBy);
        transaction.setNotes(request.reason());
        transaction.setCreatedAt(now);

        return inventoryTransactionRepository.save(transaction);
    }

    public List<InventoryTransaction> getAllTransactions() {
        return inventoryTransactionRepository.findAll();
    }

    public List<InventoryTransaction> getTransactionsByItemId(String itemId) {
        getItemById(itemId);
        return inventoryTransactionRepository.findByItemId(itemId);
    }

    public InventoryDashboardResponse getDashboard() {

        List<InventoryItem> items = inventoryRepository.findAll();

        long active = items.stream()
                .filter(i -> i.getStatus() == InventoryStatus.ACTIVE)
                .count();
        long inactive = items.stream()
                .filter(i -> i.getStatus() == InventoryStatus.INACTIVE)
                .count();

        long lowStock = items.stream()
                .filter(i -> i.getStatus() == InventoryStatus.ACTIVE)
                .filter(this::isAtOrBelowMinimum)
                .count();

        long outOfStock = items.stream()
                .filter(i -> i.getStatus() == InventoryStatus.ACTIVE)
                .filter(i -> i.getQuantity() == null || i.getQuantity() <= 0)
                .count();

        double totalValue = items.stream()
                .filter(i -> i.getStatus() == InventoryStatus.ACTIVE)
                .mapToDouble(this::stockValue)
                .sum();

        List<InventoryTransaction> recent = inventoryTransactionRepository.findAll().stream()
                .sorted((a, b) -> {
                    if (a.getCreatedAt() == null || b.getCreatedAt() == null) {
                        return 0;
                    }
                    return b.getCreatedAt().compareTo(a.getCreatedAt());
                })
                .limit(10)
                .collect(Collectors.toList());

        return new InventoryDashboardResponse(
                items.size(),
                active,
                inactive,
                lowStock,
                outOfStock,
                totalValue,
                recent);
    }

    private boolean isAtOrBelowMinimum(InventoryItem item) {
        double quantity = item.getQuantity() != null ? item.getQuantity() : 0.0;
        double minimum = item.getMinimumStock() != null ? item.getMinimumStock() : 0.0;
        return quantity <= minimum;
    }

    /** Current stock valued at the item's unit cost. */
    private double stockValue(InventoryItem item) {
        double quantity = item.getQuantity() != null ? item.getQuantity() : 0.0;
        double unitCost = item.getUnitCost() != null ? item.getUnitCost() : 0.0;
        return quantity * unitCost;
    }
}

