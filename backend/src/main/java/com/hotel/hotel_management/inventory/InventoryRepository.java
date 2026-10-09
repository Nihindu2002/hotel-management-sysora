package com.hotel.hotel_management.inventory;

import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ExecutionException;

@Repository
public class InventoryRepository {

    private final Firestore firestore;

    public InventoryRepository(Firestore firestore) {
        this.firestore = firestore;
    }

    public InventoryItem save(InventoryItem item) {

        DocumentReference document =
                firestore.collection("inventoryItems")
                        .document(item.getItemId());

        Map<String, Object> data = new HashMap<>();
        data.put("itemId", item.getItemId());
        data.put("itemName", item.getItemName());
        data.put("category", item.getCategory() != null ? item.getCategory().name() : null);
        data.put("description", item.getDescription());
        data.put("unit", item.getUnit() != null ? item.getUnit().name() : null);
        data.put("quantity", item.getQuantity() != null ? item.getQuantity() : 0.0);
        data.put("minimumStock", item.getMinimumStock() != null ? item.getMinimumStock() : 0.0);
        data.put("unitCost", item.getUnitCost() != null ? item.getUnitCost() : 0.0);
        data.put("supplierId", item.getSupplierId());
        data.put("status", item.getStatus() != null ? item.getStatus().name() : InventoryStatus.ACTIVE.name());
        data.put("createdAt", item.getCreatedAt());
        data.put("updatedAt", item.getUpdatedAt());

        try {
            document.set(data).get();
            return item;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to save inventory item", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to save inventory item", exception);
        }
    }

    public Optional<InventoryItem> findById(String itemId) {

        DocumentReference document =
                firestore.collection("inventoryItems")
                        .document(itemId);

        try {
            DocumentSnapshot snapshot = document.get().get();

            if (!snapshot.exists()) {
                return Optional.empty();
            }

            return Optional.of(toItem(snapshot));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to find inventory item", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to find inventory item", exception);
        }
    }

    public List<InventoryItem> findAll() {

        try {
            var documents =
                    firestore.collection("inventoryItems")
                            .get()
                            .get()
                            .getDocuments();

            List<InventoryItem> items = new ArrayList<>();
            for (var snapshot : documents) {
                items.add(toItem(snapshot));
            }

            return items;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to find inventory items", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to find inventory items", exception);
        }
    }

    public InventoryItem update(String itemId, UpdateInventoryItemRequest request) {

        DocumentReference document =
                firestore.collection("inventoryItems")
                        .document(itemId);

        Map<String, Object> updates = new HashMap<>();
        updates.put("itemName", request.itemName());
        updates.put("category", request.category().name());
        updates.put("description", request.description());
        updates.put("unit", request.unit().name());
        updates.put("minimumStock", request.minimumStock());
        updates.put("unitCost", request.unitCost());
        updates.put("supplierId", request.supplierId());
        updates.put("updatedAt", Instant.now());

        try {
            document.update(updates).get();
            return findById(itemId)
                    .orElseThrow(() ->
                            new IllegalArgumentException("Inventory item not found"));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to update inventory item", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to update inventory item", exception);
        }
    }

    public InventoryItem updateQuantity(String itemId, Double quantity) {

        DocumentReference document =
                firestore.collection("inventoryItems")
                        .document(itemId);

        Map<String, Object> updates = new HashMap<>();
        updates.put("quantity", quantity);
        updates.put("updatedAt", Instant.now());

        try {
            document.update(updates).get();
            return findById(itemId)
                    .orElseThrow(() ->
                            new IllegalArgumentException("Inventory item not found"));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to update inventory item quantity", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to update inventory item quantity", exception);
        }
    }

    public InventoryItem updateStatus(String itemId, InventoryStatus status) {

        DocumentReference document =
                firestore.collection("inventoryItems")
                        .document(itemId);

        Map<String, Object> updates = new HashMap<>();
        updates.put("status", status.name());
        updates.put("updatedAt", Instant.now());

        try {
            document.update(updates).get();
            return findById(itemId)
                    .orElseThrow(() ->
                            new IllegalArgumentException("Inventory item not found"));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to update inventory item status", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to update inventory item status", exception);
        }
    }

    public void delete(String itemId) {

        DocumentReference document =
                firestore.collection("inventoryItems")
                        .document(itemId);

        try {
            document.delete().get();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to delete inventory item", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to delete inventory item", exception);
        }
    }

    private InventoryItem toItem(DocumentSnapshot snapshot) {

        InventoryItem item = new InventoryItem();
        item.setItemId(snapshot.getString("itemId"));
        item.setItemName(snapshot.getString("itemName"));

        String categoryStr = snapshot.getString("category");
        if (categoryStr != null) {
            item.setCategory(InventoryCategory.valueOf(categoryStr));
        }

        item.setDescription(snapshot.getString("description"));

        String unitStr = snapshot.getString("unit");
        if (unitStr != null) {
            item.setUnit(InventoryUnit.valueOf(unitStr));
        }

        item.setQuantity(snapshot.getDouble("quantity"));
        item.setMinimumStock(snapshot.getDouble("minimumStock"));
        item.setUnitCost(snapshot.getDouble("unitCost"));
        item.setSupplierId(snapshot.getString("supplierId"));

        String statusStr = snapshot.getString("status");
        if (statusStr != null) {
            item.setStatus(InventoryStatus.valueOf(statusStr));
        }

        if (snapshot.getTimestamp("createdAt") != null) {
            item.setCreatedAt(snapshot.getTimestamp("createdAt").toDate().toInstant());
        }

        if (snapshot.getTimestamp("updatedAt") != null) {
            item.setUpdatedAt(snapshot.getTimestamp("updatedAt").toDate().toInstant());
        }

        return item;
    }
}

