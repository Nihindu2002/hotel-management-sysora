package com.hotel.hotel_management.inventory;

import com.google.firebase.auth.FirebaseToken;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @PostMapping("/items")
    public ResponseEntity<InventoryItem> createItem(
            @Valid @RequestBody CreateInventoryItemRequest request) {

        return ResponseEntity.ok(
                inventoryService.createItem(request));
    }

    @GetMapping("/items")
    public ResponseEntity<List<InventoryItem>> getAllItems() {
        return ResponseEntity.ok(
                inventoryService.getAllItems());
    }

    @GetMapping("/items/{itemId}")
    public ResponseEntity<InventoryItem> getItemById(
            @PathVariable String itemId) {

        return ResponseEntity.ok(
                inventoryService.getItemById(itemId));
    }

    @PutMapping("/items/{itemId}")
    public ResponseEntity<InventoryItem> updateItem(
            @PathVariable String itemId,
            @Valid @RequestBody UpdateInventoryItemRequest request) {

        return ResponseEntity.ok(
                inventoryService.updateItem(itemId, request));
    }

    @PatchMapping("/items/{itemId}/deactivate")
    public ResponseEntity<InventoryItem> deactivateItem(
            @PathVariable String itemId) {

        return ResponseEntity.ok(
                inventoryService.deactivateItem(itemId));
    }

    @GetMapping("/low-stock")
    public ResponseEntity<List<InventoryItem>> getLowStockItems() {
        return ResponseEntity.ok(
                inventoryService.getLowStockItems());
    }

    @PostMapping("/stock-in")
    public ResponseEntity<InventoryTransaction> stockIn(
            @Valid @RequestBody StockInRequest request,
            @AuthenticationPrincipal FirebaseToken token) {

        return ResponseEntity.ok(
                inventoryService.stockIn(
                        request,
                        token != null ? token.getUid() : null));
    }

    @PostMapping("/stock-out")
    public ResponseEntity<InventoryTransaction> stockOut(
            @Valid @RequestBody StockOutRequest request,
            @AuthenticationPrincipal FirebaseToken token) {

        return ResponseEntity.ok(
                inventoryService.stockOut(
                        request,
                        token != null ? token.getUid() : null));
    }

    @PostMapping("/adjustment")
    public ResponseEntity<InventoryTransaction> adjustStock(
            @Valid @RequestBody InventoryAdjustmentRequest request,
            @AuthenticationPrincipal FirebaseToken token) {

        return ResponseEntity.ok(
                inventoryService.adjustStock(
                        request,
                        token != null ? token.getUid() : null));
    }

    @GetMapping("/transactions")
    public ResponseEntity<List<InventoryTransaction>> getAllTransactions() {
        return ResponseEntity.ok(
                inventoryService.getAllTransactions());
    }

    @GetMapping("/items/{itemId}/transactions")
    public ResponseEntity<List<InventoryTransaction>> getTransactionsByItemId(
            @PathVariable String itemId) {

        return ResponseEntity.ok(
                inventoryService.getTransactionsByItemId(itemId));
    }
}

