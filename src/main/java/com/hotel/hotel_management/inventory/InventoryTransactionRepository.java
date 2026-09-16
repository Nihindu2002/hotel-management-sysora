package com.hotel.hotel_management.inventory;

import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ExecutionException;

@Repository
public class InventoryTransactionRepository {

    private final Firestore firestore;

    public InventoryTransactionRepository(Firestore firestore) {
        this.firestore = firestore;
    }

    public InventoryTransaction save(InventoryTransaction transaction) {

        DocumentReference document =
                firestore.collection("inventoryTransactions")
                        .document(transaction.getTransactionId());

        Map<String, Object> data = new HashMap<>();
        data.put("transactionId", transaction.getTransactionId());
        data.put("itemId", transaction.getItemId());
        data.put("transactionType", transaction.getTransactionType() != null ? transaction.getTransactionType().name() : null);
        data.put("quantity", transaction.getQuantity());
        data.put("previousQuantity", transaction.getPreviousQuantity());
        data.put("newQuantity", transaction.getNewQuantity());
        data.put("unitCost", transaction.getUnitCost());
        data.put("reference", transaction.getReference());
        data.put("performedBy", transaction.getPerformedBy());
        data.put("notes", transaction.getNotes());
        data.put("createdAt", transaction.getCreatedAt());

        try {
            document.set(data).get();
            return transaction;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to save inventory transaction", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to save inventory transaction", exception);
        }
    }

    public Optional<InventoryTransaction> findById(String transactionId) {

        DocumentReference document =
                firestore.collection("inventoryTransactions")
                        .document(transactionId);

        try {
            DocumentSnapshot snapshot = document.get().get();

            if (!snapshot.exists()) {
                return Optional.empty();
            }

            return Optional.of(toTransaction(snapshot));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to find inventory transaction", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to find inventory transaction", exception);
        }
    }

    public List<InventoryTransaction> findAll() {

        try {
            var documents =
                    firestore.collection("inventoryTransactions")
                            .get()
                            .get()
                            .getDocuments();

            List<InventoryTransaction> transactions = new ArrayList<>();
            for (var snapshot : documents) {
                transactions.add(toTransaction(snapshot));
            }

            return transactions;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to find inventory transactions", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to find inventory transactions", exception);
        }
    }

    public List<InventoryTransaction> findByItemId(String itemId) {

        try {
            var documents =
                    firestore.collection("inventoryTransactions")
                            .whereEqualTo("itemId", itemId)
                            .get()
                            .get()
                            .getDocuments();

            List<InventoryTransaction> transactions = new ArrayList<>();
            for (var snapshot : documents) {
                transactions.add(toTransaction(snapshot));
            }

            return transactions;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to find transactions for item", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to find transactions for item", exception);
        }
    }

    private InventoryTransaction toTransaction(DocumentSnapshot snapshot) {

        InventoryTransaction transaction = new InventoryTransaction();
        transaction.setTransactionId(snapshot.getString("transactionId"));
        transaction.setItemId(snapshot.getString("itemId"));

        String typeStr = snapshot.getString("transactionType");
        if (typeStr != null) {
            transaction.setTransactionType(InventoryTransactionType.valueOf(typeStr));
        }

        transaction.setQuantity(snapshot.getDouble("quantity"));
        transaction.setPreviousQuantity(snapshot.getDouble("previousQuantity"));
        transaction.setNewQuantity(snapshot.getDouble("newQuantity"));
        transaction.setUnitCost(snapshot.getDouble("unitCost"));
        transaction.setReference(snapshot.getString("reference"));
        transaction.setPerformedBy(snapshot.getString("performedBy"));
        transaction.setNotes(snapshot.getString("notes"));

        if (snapshot.getTimestamp("createdAt") != null) {
            transaction.setCreatedAt(snapshot.getTimestamp("createdAt").toDate().toInstant());
        }

        return transaction;
    }
}

