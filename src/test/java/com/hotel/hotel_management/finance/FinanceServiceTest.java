package com.hotel.hotel_management.finance;

import com.hotel.hotel_management.inventory.InventoryTransaction;
import com.hotel.hotel_management.maintenance.MaintenanceTask;
import com.hotel.hotel_management.payment.Payment;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class FinanceServiceTest {

    private FinanceRepository financeRepository;
    private FinanceService financeService;

    @BeforeEach
    void setUp() {
        financeRepository = mock(FinanceRepository.class);
        financeService = new FinanceService(financeRepository);
    }

    @Test
    void createTransaction_Income_Success() {
        CreateFinanceTransactionRequest request = new CreateFinanceTransactionRequest(
                FinanceTransactionType.INCOME,
                FinanceCategory.ROOM_REVENUE,
                100000.0,
                "Room booking income",
                "REF-001",
                FinanceReferenceType.PAYMENT,
                LocalDate.of(2026, 9, 16)
        );

        when(financeRepository.save(any(FinanceTransaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        FinanceTransaction created = financeService.createTransaction(request, "staff-user-1");

        assertNotNull(created);
        assertNotNull(created.getTransactionId());
        assertEquals(FinanceTransactionType.INCOME, created.getType());
        assertEquals(FinanceCategory.ROOM_REVENUE, created.getCategory());
        assertEquals(100000.0, created.getAmount());
        assertEquals("Room booking income", created.getDescription());
        assertEquals("REF-001", created.getReferenceId());
        assertEquals(FinanceReferenceType.PAYMENT, created.getReferenceType());
        assertEquals("staff-user-1", created.getPerformedBy());
        assertEquals(FinanceStatus.ACTIVE, created.getStatus());
        assertEquals(LocalDate.of(2026, 9, 16), created.getTransactionDate());
    }

    @Test
    void createTransaction_Expense_Success() {
        CreateFinanceTransactionRequest request = new CreateFinanceTransactionRequest(
                FinanceTransactionType.EXPENSE,
                FinanceCategory.MAINTENANCE,
                20000.0,
                "AC repair",
                "MAINT-001",
                FinanceReferenceType.MAINTENANCE,
                LocalDate.of(2026, 9, 16)
        );

        when(financeRepository.save(any(FinanceTransaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        FinanceTransaction created = financeService.createTransaction(request, "staff-user-2");

        assertNotNull(created);
        assertEquals(FinanceTransactionType.EXPENSE, created.getType());
        assertEquals(FinanceCategory.MAINTENANCE, created.getCategory());
        assertEquals(20000.0, created.getAmount());
        assertEquals(FinanceStatus.ACTIVE, created.getStatus());
    }

    @Test
    void createTransaction_FailsWhenAmountZeroOrNegative() {
        CreateFinanceTransactionRequest request = new CreateFinanceTransactionRequest(
                FinanceTransactionType.INCOME,
                FinanceCategory.ROOM_REVENUE,
                -50.0,
                "Invalid amount",
                null,
                FinanceReferenceType.OTHER,
                LocalDate.of(2026, 9, 16)
        );

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> financeService.createTransaction(request, "staff-1")
        );
        assertEquals("Amount must be greater than zero", ex.getMessage());
    }

    @Test
    void createTransaction_FailsWhenCategoryIncompatibleWithType() {
        CreateFinanceTransactionRequest request = new CreateFinanceTransactionRequest(
                FinanceTransactionType.INCOME,
                FinanceCategory.MAINTENANCE,
                500.0,
                "Incompatible category",
                null,
                FinanceReferenceType.OTHER,
                LocalDate.of(2026, 9, 16)
        );

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> financeService.createTransaction(request, "staff-1")
        );
        assertTrue(ex.getMessage().contains("Invalid category for income transaction"));
    }

    @Test
    void cancelTransaction_Success() {
        FinanceTransaction existing = new FinanceTransaction();
        existing.setTransactionId("tx-123");
        existing.setStatus(FinanceStatus.ACTIVE);

        when(financeRepository.findById("tx-123")).thenReturn(Optional.of(existing));
        when(financeRepository.updateStatus("tx-123", FinanceStatus.CANCELLED))
                .thenAnswer(invocation -> {
                    existing.setStatus(FinanceStatus.CANCELLED);
                    return existing;
                });

        FinanceTransaction cancelled = financeService.cancelTransaction("tx-123");
        assertEquals(FinanceStatus.CANCELLED, cancelled.getStatus());
        verify(financeRepository).updateStatus("tx-123", FinanceStatus.CANCELLED);
    }

    @Test
    void getFinancialSummary_CalculatesTotalsAndExcludesCancelled() {
        FinanceTransaction income1 = new FinanceTransaction();
        income1.setType(FinanceTransactionType.INCOME);
        income1.setAmount(100000.0);
        income1.setStatus(FinanceStatus.ACTIVE);
        income1.setTransactionDate(LocalDate.of(2026, 9, 10));

        FinanceTransaction expense1 = new FinanceTransaction();
        expense1.setType(FinanceTransactionType.EXPENSE);
        expense1.setAmount(20000.0);
        expense1.setStatus(FinanceStatus.ACTIVE);
        expense1.setTransactionDate(LocalDate.of(2026, 9, 12));

        FinanceTransaction cancelledExpense = new FinanceTransaction();
        cancelledExpense.setType(FinanceTransactionType.EXPENSE);
        cancelledExpense.setAmount(15000.0);
        cancelledExpense.setStatus(FinanceStatus.CANCELLED);
        cancelledExpense.setTransactionDate(LocalDate.of(2026, 9, 14));

        when(financeRepository.findAll()).thenReturn(List.of(income1, expense1, cancelledExpense));

        FinanceSummaryResponse summary = financeService.getFinancialSummary(
                LocalDate.of(2026, 9, 1),
                LocalDate.of(2026, 9, 30)
        );

        assertNotNull(summary);
        assertEquals(100000.0, summary.totalIncome());
        assertEquals(20000.0, summary.totalExpenses());
        assertEquals(80000.0, summary.netIncome());
    }

    @Test
    void getTransactionsBetween_ValidatesDateOrder() {
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> financeService.getTransactionsBetween(
                        LocalDate.of(2026, 9, 30),
                        LocalDate.of(2026, 9, 1)
                )
        );
        assertEquals("Start date cannot be after end date", ex.getMessage());
    }

    @Test
    void recordPaymentIncome_SuccessAndDuplicateProtection() {
        Payment payment = new Payment();
        payment.setPaymentId("pay-999");
        payment.setInvoiceId("inv-123");
        payment.setAmount(45000.0);
        payment.setRecordedBy("staff-1");

        when(financeRepository.findByReferenceId("pay-999")).thenReturn(Collections.emptyList());
        when(financeRepository.save(any(FinanceTransaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        FinanceTransaction tx = financeService.recordPaymentIncome(payment);
        assertNotNull(tx);
        assertEquals(FinanceTransactionType.INCOME, tx.getType());
        assertEquals(FinanceCategory.ROOM_REVENUE, tx.getCategory());
        assertEquals(45000.0, tx.getAmount());
        assertEquals("pay-999", tx.getReferenceId());
        assertEquals(FinanceReferenceType.PAYMENT, tx.getReferenceType());

        // Now simulate second call with existing active transaction
        when(financeRepository.findByReferenceId("pay-999")).thenReturn(List.of(tx));
        FinanceTransaction duplicateAttempt = financeService.recordPaymentIncome(payment);
        assertNull(duplicateAttempt);
        verify(financeRepository, times(1)).save(any(FinanceTransaction.class));
    }

    @Test
    void recordInventoryExpense_SuccessAndDuplicateProtection() {
        InventoryTransaction invTx = new InventoryTransaction();
        invTx.setTransactionId("inv-tx-1");
        invTx.setQuantity(10.0);
        invTx.setUnitCost(2500.0); // total 25000.0
        invTx.setReference("PO-888");
        invTx.setPerformedBy("staff-inv");

        when(financeRepository.findByReferenceId("inv-tx-1")).thenReturn(Collections.emptyList());
        when(financeRepository.save(any(FinanceTransaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        FinanceTransaction tx = financeService.recordInventoryExpense(invTx);
        assertNotNull(tx);
        assertEquals(FinanceTransactionType.EXPENSE, tx.getType());
        assertEquals(FinanceCategory.INVENTORY, tx.getCategory());
        assertEquals(25000.0, tx.getAmount());
        assertEquals("inv-tx-1", tx.getReferenceId());
        assertEquals(FinanceReferenceType.INVENTORY_TRANSACTION, tx.getReferenceType());

        // Duplicate call
        when(financeRepository.findByReferenceId("inv-tx-1")).thenReturn(List.of(tx));
        FinanceTransaction duplicateAttempt = financeService.recordInventoryExpense(invTx);
        assertNull(duplicateAttempt);
        verify(financeRepository, times(1)).save(any(FinanceTransaction.class));
    }

    @Test
    void recordInventoryExpense_DoesNotCreateForStockOutOrAdjustment() {
        InventoryTransaction stockOutTx = new InventoryTransaction();
        stockOutTx.setTransactionId("tx-out");
        stockOutTx.setTransactionType(com.hotel.hotel_management.inventory.InventoryTransactionType.STOCK_OUT);
        stockOutTx.setQuantity(5.0);
        stockOutTx.setUnitCost(100.0);

        FinanceTransaction outResult = financeService.recordInventoryExpense(stockOutTx);
        assertNull(outResult);

        InventoryTransaction adjTx = new InventoryTransaction();
        adjTx.setTransactionId("tx-adj");
        adjTx.setTransactionType(com.hotel.hotel_management.inventory.InventoryTransactionType.ADJUSTMENT);
        adjTx.setQuantity(2.0);
        adjTx.setUnitCost(100.0);

        FinanceTransaction adjResult = financeService.recordInventoryExpense(adjTx);
        assertNull(adjResult);
    }

    @Test
    void recordPaymentRefund_SuccessAndDuplicateProtection() {
        Payment payment = new Payment();
        payment.setPaymentId("pay-777");
        payment.setInvoiceId("inv-456");
        payment.setAmount(15000.0);
        payment.setRecordedBy("staff-2");

        when(financeRepository.findByReferenceId("pay-777")).thenReturn(Collections.emptyList());
        when(financeRepository.save(any(FinanceTransaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        FinanceTransaction tx = financeService.recordPaymentRefund(payment, "staff-user-1");
        assertNotNull(tx);
        assertEquals(FinanceTransactionType.EXPENSE, tx.getType());
        assertEquals(FinanceCategory.REFUND, tx.getCategory());
        assertEquals(15000.0, tx.getAmount());
        assertEquals("pay-777", tx.getReferenceId());
        assertEquals(FinanceReferenceType.PAYMENT_REFUND, tx.getReferenceType());
        assertEquals("staff-user-1", tx.getPerformedBy());

        // Duplicate call
        when(financeRepository.findByReferenceId("pay-777")).thenReturn(List.of(tx));
        FinanceTransaction duplicateAttempt = financeService.recordPaymentRefund(payment, "staff-user-1");
        assertNull(duplicateAttempt);
        verify(financeRepository, times(1)).save(any(FinanceTransaction.class));
    }

    @Test
    void recordMaintenanceExpense_SuccessAndDuplicateProtection() {
        MaintenanceTask task = new MaintenanceTask();
        task.setTaskId("maint-101");
        task.setRoomId("room-1");
        task.setDescription("AC Repair");
        task.setActualCost(10000.0);
        task.setReportedBy("staff-reporter");

        when(financeRepository.findByReferenceId("maint-101")).thenReturn(Collections.emptyList());
        when(financeRepository.save(any(FinanceTransaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        FinanceTransaction tx = financeService.recordMaintenanceExpense(task, "maint-staff-1");
        assertNotNull(tx);
        assertEquals(FinanceTransactionType.EXPENSE, tx.getType());
        assertEquals(FinanceCategory.MAINTENANCE, tx.getCategory());
        assertEquals(10000.0, tx.getAmount());
        assertEquals("maint-101", tx.getReferenceId());
        assertEquals(FinanceReferenceType.MAINTENANCE_TASK, tx.getReferenceType());
        assertEquals("maint-staff-1", tx.getPerformedBy());

        // Duplicate call
        when(financeRepository.findByReferenceId("maint-101")).thenReturn(List.of(tx));
        FinanceTransaction duplicate = financeService.recordMaintenanceExpense(task, "maint-staff-1");
        assertNull(duplicate);
        verify(financeRepository, times(1)).save(any(FinanceTransaction.class));
    }

    @Test
    void recordMaintenanceExpense_ZeroOrNullCostReturnsNull() {
        MaintenanceTask task = new MaintenanceTask();
        task.setTaskId("maint-zero");
        task.setActualCost(0.0);

        FinanceTransaction tx = financeService.recordMaintenanceExpense(task);
        assertNull(tx);

        task.setActualCost(null);
        FinanceTransaction txNull = financeService.recordMaintenanceExpense(task);
        assertNull(txNull);
    }

    @Test
    void updateMaintenanceExpense_UpdatesAmountAndDoesNotDuplicate() {
        MaintenanceTask task = new MaintenanceTask();
        task.setTaskId("maint-202");
        task.setActualCost(10000.0);

        FinanceTransaction existingTx = new FinanceTransaction();
        existingTx.setTransactionId("tx-maint-202");
        existingTx.setReferenceId("maint-202");
        existingTx.setReferenceType(FinanceReferenceType.MAINTENANCE_TASK);
        existingTx.setAmount(10000.0);
        existingTx.setStatus(FinanceStatus.ACTIVE);

        when(financeRepository.findByReferenceId("maint-202")).thenReturn(List.of(existingTx));
        when(financeRepository.updateAmount("tx-maint-202", 12000.0)).thenAnswer(inv -> {
            existingTx.setAmount(12000.0);
            return existingTx;
        });

        FinanceTransaction updated = financeService.updateMaintenanceExpense(task, 12000.0, "manager-1");
        assertNotNull(updated);
        assertEquals(12000.0, updated.getAmount());

        // Verify save was never called to create a new transaction
        verify(financeRepository, never()).save(any(FinanceTransaction.class));
        verify(financeRepository).updateAmount("tx-maint-202", 12000.0);
    }

    @Test
    void cancelMaintenanceExpense_CancelsActiveTransaction() {
        FinanceTransaction existingTx = new FinanceTransaction();
        existingTx.setTransactionId("tx-cancel-1");
        existingTx.setReferenceId("maint-cancel");
        existingTx.setReferenceType(FinanceReferenceType.MAINTENANCE_TASK);
        existingTx.setStatus(FinanceStatus.ACTIVE);

        when(financeRepository.findByReferenceId("maint-cancel")).thenReturn(List.of(existingTx));
        when(financeRepository.updateStatus("tx-cancel-1", FinanceStatus.CANCELLED)).thenAnswer(inv -> {
            existingTx.setStatus(FinanceStatus.CANCELLED);
            return existingTx;
        });

        FinanceTransaction cancelled = financeService.cancelMaintenanceExpense("maint-cancel");
        assertNotNull(cancelled);
        assertEquals(FinanceStatus.CANCELLED, cancelled.getStatus());
        verify(financeRepository).updateStatus("tx-cancel-1", FinanceStatus.CANCELLED);
    }
}

