package com.hotel.hotel_management.inventory;

import java.util.List;

/**
 * Aggregated figures for the inventory dashboard.
 *
 * <p>{@code lowStockItems} follows the same rule as {@code GET /low-stock}:
 * active items whose quantity is at or below their minimum stock. Out-of-stock
 * items are therefore also counted as low stock; {@code outOfStockItems} breaks
 * that subset out separately.
 */
public record InventoryDashboardResponse(
        long totalItems,
        long activeItems,
        long inactiveItems,
        long lowStockItems,
        long outOfStockItems,
        double totalInventoryValue,
        List<InventoryTransaction> recentTransactions
) {
}
