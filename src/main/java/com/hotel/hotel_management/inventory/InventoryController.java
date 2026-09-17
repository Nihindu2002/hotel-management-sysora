package com.hotel.hotel_management.inventory;
import com.google.firebase.auth.FirebaseToken;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Inventory", description = "Inventory item management and stock transaction tracking")
@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @Operation(summary = "Create inventory item", description = "Adds a new inventory item to catalog")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Item created"),
            @ApiResponse(responseCode = "400", description = "Validation error")
    })
    @PostMapping("/items")
    public ResponseEntity<InventoryItem> createItem(
            @Valid @RequestBody CreateInventoryItemRequest request) {

        return ResponseEntity.ok(
                inventoryService.createItem(request));
    }

    @Operation(summary = "Get all inventory items", description = "Retrieves all items in inventory")
    @GetMapping("/items")
    public ResponseEntity<List<InventoryItem>> getAllItems() {
        return ResponseEntity.ok(
                inventoryService.getAllItems());
    }

    @Operation(summary = "Get inventory item by ID", description = "Retrieves details of an inventory item")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Item found"),
            @ApiResponse(responseCode = "404", description = "Item not found")
    })
    @GetMapping("/items/{itemId}")
    public ResponseEntity<InventoryItem> getItemById(
            @PathVariable String itemId) {

        return ResponseEntity.ok(
                inventoryService.getItemById(itemId));
    }

    @Operation(summary = "Update inventory item", description = "Updates inventory item details")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Item updated"),
            @ApiResponse(responseCode = "404", description = "Item not found")
    })
    @PutMapping("/items/{itemId}")
    public ResponseEntity<InventoryItem> updateItem(
            @PathVariable String itemId,
            @Valid @RequestBody UpdateInventoryItemRequest request) {

        return ResponseEntity.ok(
                inventoryService.updateItem(itemId, request));
    }

    @Operation(summary = "Deactivate inventory item", description = "Deactivates an inventory item")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Item deactivated"),
            @ApiResponse(responseCode = "404", description = "Item not found")
    })
    @PatchMapping("/items/{itemId}/deactivate")
    public ResponseEntity<InventoryItem> deactivateItem(
            @PathVariable String itemId) {

        return ResponseEntity.ok(
                inventoryService.deactivateItem(itemId));
    }

    @Operation(summary = "Get low stock items", description = "Retrieves items whose quantity is below minimum threshold")
    @GetMapping("/low-stock")
    public ResponseEntity<List<InventoryItem>> getLowStockItems() {
        return ResponseEntity.ok(
                inventoryService.getLowStockItems());
    }

    @Operation(summary = "Get inventory dashboard", description = "Returns totals, stock status counts, inventory value, and recent stock movements")
    @GetMapping("/dashboard")
    public ResponseEntity<InventoryDashboardResponse> getDashboard() {
        return ResponseEntity.ok(
                inventoryService.getDashboard());
    }

    @Operation(summary = "Stock In (Purchase/Restock)", description = "Adds stock and automatically creates a finance EXPENSE record if purchase")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Stock added"),
            @ApiResponse(responseCode = "400", description = "Validation error"),
            @ApiResponse(responseCode = "404", description = "Item not found")
    })
    @PostMapping("/stock-in")
    public ResponseEntity<InventoryTransaction> stockIn(
            @Valid @RequestBody StockInRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token) {

        return ResponseEntity.ok(
                inventoryService.stockIn(
                        request,
                        token != null ? token.getUid() : null));
    }

    @Operation(summary = "Stock Out (Usage)", description = "Deducts stock from inventory (does not affect finance)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Stock deducted"),
            @ApiResponse(responseCode = "400", description = "Insufficient quantity or validation error"),
            @ApiResponse(responseCode = "404", description = "Item not found")
    })
    @PostMapping("/stock-out")
    public ResponseEntity<InventoryTransaction> stockOut(
            @Valid @RequestBody StockOutRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token) {

        return ResponseEntity.ok(
                inventoryService.stockOut(
                        request,
                        token != null ? token.getUid() : null));
    }

    @Operation(summary = "Stock Adjustment", description = "Reconciles inventory discrepancy (does not affect finance)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Stock adjusted"),
            @ApiResponse(responseCode = "404", description = "Item not found")
    })
    @PostMapping("/adjustment")
    public ResponseEntity<InventoryTransaction> adjustStock(
            @Valid @RequestBody InventoryAdjustmentRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token) {

        return ResponseEntity.ok(
                inventoryService.adjustStock(
                        request,
                        token != null ? token.getUid() : null));
    }

    @Operation(summary = "Get all inventory transactions", description = "Retrieves audit log of all stock movements")
    @GetMapping("/transactions")
    public ResponseEntity<List<InventoryTransaction>> getAllTransactions() {
        return ResponseEntity.ok(
                inventoryService.getAllTransactions());
    }

    @Operation(summary = "Get transactions by item ID", description = "Retrieves stock movement history for a specific item")
    @GetMapping("/items/{itemId}/transactions")
    public ResponseEntity<List<InventoryTransaction>> getTransactionsByItemId(
            @PathVariable String itemId) {

        return ResponseEntity.ok(
                inventoryService.getTransactionsByItemId(itemId));
    }
}

