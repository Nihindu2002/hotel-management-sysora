package com.hotel.hotel_management.inventory;

import com.hotel.hotel_management.finance.FinanceService;
import com.hotel.hotel_management.notification.NotificationService;
import com.hotel.hotel_management.notification.NotificationType;
import com.hotel.hotel_management.user.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class InventoryServiceTest {

    private InventoryRepository inventoryRepository;
    private InventoryTransactionRepository inventoryTransactionRepository;
    private FinanceService financeService;
    private NotificationService notificationService;
    private InventoryService inventoryService;

    @BeforeEach
    void setUp() {
        inventoryRepository = mock(InventoryRepository.class);
        inventoryTransactionRepository = mock(InventoryTransactionRepository.class);
        financeService = mock(FinanceService.class);
        notificationService = mock(NotificationService.class);
        inventoryService = new InventoryService(
                inventoryRepository,
                inventoryTransactionRepository,
                financeService,
                notificationService
        );
    }

    @Test
    void stockIn_Success_CallsFinanceExpense() {
        InventoryItem item = new InventoryItem();
        item.setItemId("item-1");
        item.setItemName("Bath Towel");
        item.setQuantity(10.0);
        item.setUnitCost(500.0);
        item.setStatus(InventoryStatus.ACTIVE);

        when(inventoryRepository.findById("item-1")).thenReturn(Optional.of(item));
        when(inventoryTransactionRepository.save(any(InventoryTransaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        StockInRequest request = new StockInRequest("item-1", 20.0, 500.0, "PO-100", "Purchased 20 towels");

        InventoryTransaction tx = inventoryService.stockIn(request, "staff-uid");

        assertNotNull(tx);
        assertEquals(InventoryTransactionType.STOCK_IN, tx.getTransactionType());
        assertEquals(20.0, tx.getQuantity());
        assertEquals(10.0, tx.getPreviousQuantity());
        assertEquals(30.0, tx.getNewQuantity());
        assertEquals(500.0, tx.getUnitCost());
        assertEquals("staff-uid", tx.getPerformedBy());

        verify(inventoryRepository).updateQuantity("item-1", 30.0);
        verify(financeService).recordInventoryExpense(tx);
    }

    @Test
    void stockOut_Success_DoesNotCallFinanceExpense() {
        InventoryItem item = new InventoryItem();
        item.setItemId("item-2");
        item.setItemName("Bath Towel");
        item.setQuantity(30.0);
        item.setUnitCost(500.0);
        item.setStatus(InventoryStatus.ACTIVE);

        when(inventoryRepository.findById("item-2")).thenReturn(Optional.of(item));
        when(inventoryTransactionRepository.save(any(InventoryTransaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        StockOutRequest request = new StockOutRequest("item-2", 5.0, "REQ-5", "Used 5 towels");

        InventoryTransaction tx = inventoryService.stockOut(request, "staff-uid");

        assertNotNull(tx);
        assertEquals(InventoryTransactionType.STOCK_OUT, tx.getTransactionType());
        assertEquals(5.0, tx.getQuantity());
        assertEquals(30.0, tx.getPreviousQuantity());
        assertEquals(25.0, tx.getNewQuantity());

        verify(inventoryRepository).updateQuantity("item-2", 25.0);
        verifyNoInteractions(financeService);
    }

    @Test
    void stockOut_AlertsAdminsAndManagersWhenCrossingMinimumStock() {
        // 30 on hand, minimum 10 — drawing down to 8 is the crossing.
        InventoryItem item = item("item-low", 30.0, 10.0, 500.0, InventoryStatus.ACTIVE);
        when(inventoryRepository.findById("item-low")).thenReturn(Optional.of(item));
        when(inventoryTransactionRepository.save(any(InventoryTransaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        inventoryService.stockOut(new StockOutRequest("item-low", 22.0, "REQ-1", null), "staff-uid");

        verify(notificationService).emitToRoles(
                eq(Set.of(Role.ADMIN, Role.MANAGER)),
                eq(NotificationType.INVENTORY),
                contains("Bath Towel"),
                anyString(),
                eq("/inventory/items/item-low"),
                eq("item-low"));
    }

    @Test
    void stockOut_DoesNotAlertWhileAlreadyBelowMinimum() {
        // Already below the minimum before the movement — no new crossing.
        InventoryItem item = item("item-already-low", 8.0, 10.0, 500.0, InventoryStatus.ACTIVE);
        when(inventoryRepository.findById("item-already-low")).thenReturn(Optional.of(item));
        when(inventoryTransactionRepository.save(any(InventoryTransaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        inventoryService.stockOut(
                new StockOutRequest("item-already-low", 2.0, "REQ-2", null), "staff-uid");

        verify(notificationService, never()).emitToRoles(any(), any(), anyString(), anyString(), any(), any());
    }

    @Test
    void stockOut_DoesNotAlertWhenStayingAboveMinimum() {
        InventoryItem item = item("item-healthy", 30.0, 10.0, 500.0, InventoryStatus.ACTIVE);
        when(inventoryRepository.findById("item-healthy")).thenReturn(Optional.of(item));
        when(inventoryTransactionRepository.save(any(InventoryTransaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        inventoryService.stockOut(new StockOutRequest("item-healthy", 5.0, "REQ-3", null), "staff-uid");

        verify(notificationService, never()).emitToRoles(any(), any(), anyString(), anyString(), any(), any());
    }

    @Test
    void adjustStock_Success_DoesNotCallFinanceExpense() {
        InventoryItem item = new InventoryItem();
        item.setItemId("item-3");
        item.setItemName("Shampoo");
        item.setQuantity(50.0);
        item.setUnitCost(200.0);
        item.setStatus(InventoryStatus.ACTIVE);

        when(inventoryRepository.findById("item-3")).thenReturn(Optional.of(item));
        when(inventoryTransactionRepository.save(any(InventoryTransaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        InventoryAdjustmentRequest request = new InventoryAdjustmentRequest("item-3", 48.0, "Damaged stock count");

        InventoryTransaction tx = inventoryService.adjustStock(request, "staff-uid");

        assertNotNull(tx);
        assertEquals(InventoryTransactionType.ADJUSTMENT, tx.getTransactionType());
        assertEquals(2.0, tx.getQuantity());
        assertEquals(50.0, tx.getPreviousQuantity());
        assertEquals(48.0, tx.getNewQuantity());

        verify(inventoryRepository).updateQuantity("item-3", 48.0);
        verifyNoInteractions(financeService);
    }

    @Test
    void stockIn_FailsIfQuantityZeroOrNegative() {
        InventoryItem item = new InventoryItem();
        item.setItemId("item-4");
        item.setStatus(InventoryStatus.ACTIVE);

        when(inventoryRepository.findById("item-4")).thenReturn(Optional.of(item));

        StockInRequest request = new StockInRequest("item-4", 0.0, 100.0, null, null);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> inventoryService.stockIn(request, "staff-uid")
        );
        assertEquals("Stock-in quantity must be greater than zero", ex.getMessage());
    }

    @Test
    void stockIn_FailsIfUnitCostNegative() {
        InventoryItem item = new InventoryItem();
        item.setItemId("item-5");
        item.setStatus(InventoryStatus.ACTIVE);

        when(inventoryRepository.findById("item-5")).thenReturn(Optional.of(item));

        StockInRequest request = new StockInRequest("item-5", 10.0, -50.0, null, null);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> inventoryService.stockIn(request, "staff-uid")
        );
        assertEquals("Unit cost cannot be negative", ex.getMessage());
    }

    @Test
    void stockIn_FailsIfItemInactive() {
        InventoryItem item = new InventoryItem();
        item.setItemId("item-6");
        item.setStatus(InventoryStatus.INACTIVE);

        when(inventoryRepository.findById("item-6")).thenReturn(Optional.of(item));

        StockInRequest request = new StockInRequest("item-6", 10.0, 100.0, null, null);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> inventoryService.stockIn(request, "staff-uid")
        );
        assertEquals("Cannot receive stock for inactive item", ex.getMessage());
    }

    // ── Stock out ────────────────────────────────────────────────────────────

    private InventoryItem item(String id, double quantity, double minimum, double unitCost, InventoryStatus status) {
        InventoryItem item = new InventoryItem();
        item.setItemId(id);
        item.setItemName("Bath Towel");
        item.setCategory(InventoryCategory.LINEN);
        item.setQuantity(quantity);
        item.setMinimumStock(minimum);
        item.setUnitCost(unitCost);
        item.setStatus(status);
        return item;
    }

    @Test
    void stockOut_Success_UpdatesQuantityAndRecordsHistory() {
        when(inventoryRepository.findById("item-1"))
                .thenReturn(Optional.of(item("item-1", 30.0, 10.0, 500.0, InventoryStatus.ACTIVE)));
        when(inventoryTransactionRepository.save(any(InventoryTransaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        StockOutRequest request = new StockOutRequest("item-1", 12.0, "HK-REQ-1", "Issued to housekeeping");

        InventoryTransaction tx = inventoryService.stockOut(request, "staff-uid");

        assertEquals(InventoryTransactionType.STOCK_OUT, tx.getTransactionType());
        assertEquals(12.0, tx.getQuantity());
        assertEquals(30.0, tx.getPreviousQuantity());
        assertEquals(18.0, tx.getNewQuantity());
        assertEquals("staff-uid", tx.getPerformedBy());

        verify(inventoryRepository).updateQuantity("item-1", 18.0);
        // Stock out is consumption, not a purchase — it must never hit finance.
        verifyNoInteractions(financeService);
    }

    @Test
    void stockOut_FailsWhenQuantityExceedsAvailable() {
        when(inventoryRepository.findById("item-1"))
                .thenReturn(Optional.of(item("item-1", 5.0, 2.0, 500.0, InventoryStatus.ACTIVE)));

        StockOutRequest request = new StockOutRequest("item-1", 8.0, null, null);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> inventoryService.stockOut(request, "staff-uid")
        );

        assertTrue(ex.getMessage().contains("Insufficient stock available"));
        verify(inventoryRepository, never()).updateQuantity(anyString(), anyDouble());
        verifyNoInteractions(financeService);
    }

    @Test
    void stockOut_FailsWhenQuantityZeroOrNegative() {
        when(inventoryRepository.findById("item-1"))
                .thenReturn(Optional.of(item("item-1", 10.0, 2.0, 500.0, InventoryStatus.ACTIVE)));

        StockOutRequest request = new StockOutRequest("item-1", 0.0, null, null);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> inventoryService.stockOut(request, "staff-uid")
        );
        assertEquals("Stock-out quantity must be greater than zero", ex.getMessage());
    }

    @Test
    void stockOut_FailsWhenItemInactive() {
        when(inventoryRepository.findById("item-1"))
                .thenReturn(Optional.of(item("item-1", 10.0, 2.0, 500.0, InventoryStatus.INACTIVE)));

        StockOutRequest request = new StockOutRequest("item-1", 1.0, null, null);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> inventoryService.stockOut(request, "staff-uid")
        );
        assertEquals("Cannot issue stock for inactive item", ex.getMessage());
    }

    // ── Adjustment ───────────────────────────────────────────────────────────

    @Test
    void adjustStock_Success_SetsExactNewQuantity() {
        when(inventoryRepository.findById("item-1"))
                .thenReturn(Optional.of(item("item-1", 30.0, 10.0, 500.0, InventoryStatus.ACTIVE)));
        when(inventoryTransactionRepository.save(any(InventoryTransaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        InventoryAdjustmentRequest request =
                new InventoryAdjustmentRequest("item-1", 27.0, "Stock count discrepancy");

        InventoryTransaction tx = inventoryService.adjustStock(request, "staff-uid");

        assertEquals(InventoryTransactionType.ADJUSTMENT, tx.getTransactionType());
        assertEquals(30.0, tx.getPreviousQuantity());
        assertEquals(27.0, tx.getNewQuantity());
        // Signed delta is recorded as an absolute movement of 3 units.
        assertEquals(3.0, tx.getQuantity());
        assertEquals("Stock count discrepancy", tx.getNotes());

        verify(inventoryRepository).updateQuantity("item-1", 27.0);
        verifyNoInteractions(financeService);
    }

    @Test
    void adjustStock_Upwards_RecordsAbsoluteDelta() {
        when(inventoryRepository.findById("item-1"))
                .thenReturn(Optional.of(item("item-1", 4.0, 10.0, 500.0, InventoryStatus.ACTIVE)));
        when(inventoryTransactionRepository.save(any(InventoryTransaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        InventoryTransaction tx = inventoryService.adjustStock(
                new InventoryAdjustmentRequest("item-1", 15.0, "Found extra stock"), "staff-uid");

        assertEquals(4.0, tx.getPreviousQuantity());
        assertEquals(15.0, tx.getNewQuantity());
        assertEquals(11.0, tx.getQuantity());
        verify(inventoryRepository).updateQuantity("item-1", 15.0);
        verifyNoInteractions(financeService);
    }

    @Test
    void adjustStock_FailsWhenNewQuantityNegative() {
        when(inventoryRepository.findById("item-1"))
                .thenReturn(Optional.of(item("item-1", 10.0, 2.0, 500.0, InventoryStatus.ACTIVE)));

        InventoryAdjustmentRequest request = new InventoryAdjustmentRequest("item-1", -1.0, null);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> inventoryService.adjustStock(request, "staff-uid")
        );
        assertEquals("Quantity cannot be negative", ex.getMessage());
        verify(inventoryRepository, never()).updateQuantity(anyString(), anyDouble());
    }

    @Test
    void adjustStock_FailsWhenItemInactive() {
        when(inventoryRepository.findById("item-1"))
                .thenReturn(Optional.of(item("item-1", 10.0, 2.0, 500.0, InventoryStatus.INACTIVE)));

        InventoryAdjustmentRequest request = new InventoryAdjustmentRequest("item-1", 5.0, null);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> inventoryService.adjustStock(request, "staff-uid")
        );
        assertEquals("Cannot adjust stock for inactive item", ex.getMessage());
    }

    // ── Item creation ────────────────────────────────────────────────────────

    @Test
    void createItem_StartsEmptyAndActive() {
        when(inventoryRepository.save(any(InventoryItem.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CreateInventoryItemRequest request = new CreateInventoryItemRequest(
                "Bath Towel",
                InventoryCategory.LINEN,
                "White cotton towels",
                InventoryUnit.PIECE,
                20.0,
                500.0,
                "supplier-1");

        InventoryItem created = inventoryService.createItem(request);

        assertEquals("Bath Towel", created.getItemName());
        // Quantity is only ever moved by stock transactions, so it starts at zero.
        assertEquals(0.0, created.getQuantity());
        assertEquals(InventoryStatus.ACTIVE, created.getStatus());
        assertEquals(20.0, created.getMinimumStock());
    }

    @Test
    void createItem_FailsWhenMinimumStockNegative() {
        CreateInventoryItemRequest request = new CreateInventoryItemRequest(
                "Bath Towel", InventoryCategory.LINEN, null,
                InventoryUnit.PIECE, -1.0, 500.0, null);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> inventoryService.createItem(request)
        );
        assertEquals("Minimum stock cannot be negative", ex.getMessage());
        verify(inventoryRepository, never()).save(any());
    }

    @Test
    void createItem_FailsWhenUnitCostNegative() {
        CreateInventoryItemRequest request = new CreateInventoryItemRequest(
                "Bath Towel", InventoryCategory.LINEN, null,
                InventoryUnit.PIECE, 5.0, -0.01, null);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> inventoryService.createItem(request)
        );
        assertEquals("Unit cost cannot be negative", ex.getMessage());
        verify(inventoryRepository, never()).save(any());
    }

    // ── Low stock and dashboard ──────────────────────────────────────────────

    @Test
    void getLowStockItems_ReturnsActiveItemsAtOrBelowMinimum() {
        when(inventoryRepository.findAll()).thenReturn(java.util.List.of(
                item("below", 3.0, 10.0, 100.0, InventoryStatus.ACTIVE),
                item("exactly-at", 10.0, 10.0, 100.0, InventoryStatus.ACTIVE),
                item("empty", 0.0, 10.0, 100.0, InventoryStatus.ACTIVE),
                item("healthy", 50.0, 10.0, 100.0, InventoryStatus.ACTIVE),
                item("inactive-low", 1.0, 10.0, 100.0, InventoryStatus.INACTIVE)));

        var lowStock = inventoryService.getLowStockItems();

        assertEquals(3, lowStock.size());
        var ids = lowStock.stream().map(InventoryItem::getItemId).toList();
        assertTrue(ids.containsAll(java.util.List.of("below", "exactly-at", "empty")));
    }

    @Test
    void getDashboard_AggregatesCountsValueAndRecentTransactions() {
        InventoryItem towels = item("towels", 30.0, 10.0, 500.0, InventoryStatus.ACTIVE);   // 15,000
        InventoryItem soap = item("soap", 5.0, 10.0, 200.0, InventoryStatus.ACTIVE);       // 1,000 (low)
        InventoryItem lamps = item("lamps", 0.0, 4.0, 2500.0, InventoryStatus.ACTIVE);     // 0 (low + out)
        InventoryItem retired = item("retired", 8.0, 2.0, 100.0, InventoryStatus.INACTIVE); // excluded

        when(inventoryRepository.findAll())
                .thenReturn(java.util.List.of(towels, soap, lamps, retired));

        InventoryTransaction newest = new InventoryTransaction();
        newest.setTransactionId("tx-new");
        newest.setCreatedAt(Instant.parse("2026-01-02T10:00:00Z"));

        InventoryTransaction oldest = new InventoryTransaction();
        oldest.setTransactionId("tx-old");
        oldest.setCreatedAt(Instant.parse("2026-01-01T10:00:00Z"));

        when(inventoryTransactionRepository.findAll())
                .thenReturn(java.util.List.of(oldest, newest));

        InventoryDashboardResponse dashboard = inventoryService.getDashboard();

        assertEquals(4, dashboard.totalItems());
        assertEquals(3, dashboard.activeItems());
        assertEquals(1, dashboard.inactiveItems());
        assertEquals(2, dashboard.lowStockItems());
        assertEquals(1, dashboard.outOfStockItems());
        assertEquals(16000.0, dashboard.totalInventoryValue());
        assertEquals(2, dashboard.recentTransactions().size());
        // Newest movement first.
        assertEquals("tx-new", dashboard.recentTransactions().get(0).getTransactionId());
    }
}

