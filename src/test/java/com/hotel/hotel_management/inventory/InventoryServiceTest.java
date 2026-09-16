package com.hotel.hotel_management.inventory;

import com.hotel.hotel_management.finance.FinanceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class InventoryServiceTest {

    private InventoryRepository inventoryRepository;
    private InventoryTransactionRepository inventoryTransactionRepository;
    private FinanceService financeService;
    private InventoryService inventoryService;

    @BeforeEach
    void setUp() {
        inventoryRepository = mock(InventoryRepository.class);
        inventoryTransactionRepository = mock(InventoryTransactionRepository.class);
        financeService = mock(FinanceService.class);
        inventoryService = new InventoryService(
                inventoryRepository,
                inventoryTransactionRepository,
                financeService
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
}

