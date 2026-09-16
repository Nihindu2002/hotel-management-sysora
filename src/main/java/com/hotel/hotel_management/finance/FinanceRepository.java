package com.hotel.hotel_management.finance;

import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ExecutionException;

@Repository
public class FinanceRepository {

    private final Firestore firestore;

    public FinanceRepository(Firestore firestore) {
        this.firestore = firestore;
    }

    public FinanceTransaction save(FinanceTransaction transaction) {
        DocumentReference document = firestore.collection("financeTransactions")
                .document(transaction.getTransactionId());

        Map<String, Object> data = new HashMap<>();
        data.put("transactionId", transaction.getTransactionId());
        data.put("type", transaction.getType() != null ? transaction.getType().name() : null);
        data.put("category", transaction.getCategory() != null ? transaction.getCategory().name() : null);
        data.put("amount", transaction.getAmount() != null ? transaction.getAmount() : 0.0);
        data.put("description", transaction.getDescription());
        data.put("referenceId", transaction.getReferenceId());
        data.put("referenceType", transaction.getReferenceType() != null ? transaction.getReferenceType().name() : null);
        data.put("performedBy", transaction.getPerformedBy());
        data.put("transactionDate", transaction.getTransactionDate() != null ? transaction.getTransactionDate().toString() : null);
        data.put("status", transaction.getStatus() != null ? transaction.getStatus().name() : FinanceStatus.ACTIVE.name());
        data.put("createdAt", transaction.getCreatedAt() != null ? Date.from(transaction.getCreatedAt()) : Date.from(Instant.now()));
        data.put("updatedAt", transaction.getUpdatedAt() != null ? Date.from(transaction.getUpdatedAt()) : Date.from(Instant.now()));

        try {
            document.set(data).get();
            return transaction;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to save finance transaction", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to save finance transaction", exception);
        }
    }

    public Optional<FinanceTransaction> findById(String transactionId) {
        DocumentReference document = firestore.collection("financeTransactions")
                .document(transactionId);

        try {
            DocumentSnapshot snapshot = document.get().get();
            if (!snapshot.exists()) {
                return Optional.empty();
            }
            return Optional.of(toTransaction(snapshot));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to find finance transaction by id", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to find finance transaction by id", exception);
        }
    }

    public List<FinanceTransaction> findAll() {
        try {
            var documents = firestore.collection("financeTransactions")
                    .get()
                    .get()
                    .getDocuments();

            List<FinanceTransaction> list = new ArrayList<>();
            for (var snapshot : documents) {
                list.add(toTransaction(snapshot));
            }
            return list;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to find all finance transactions", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to find all finance transactions", exception);
        }
    }

    public List<FinanceTransaction> findByReferenceId(String referenceId) {
        try {
            var documents = firestore.collection("financeTransactions")
                    .whereEqualTo("referenceId", referenceId)
                    .get()
                    .get()
                    .getDocuments();

            List<FinanceTransaction> list = new ArrayList<>();
            for (var snapshot : documents) {
                list.add(toTransaction(snapshot));
            }
            return list;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to find finance transactions by referenceId", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to find finance transactions by referenceId", exception);
        }
    }

    public List<FinanceTransaction> findByType(FinanceTransactionType type) {
        try {
            var documents = firestore.collection("financeTransactions")
                    .whereEqualTo("type", type.name())
                    .get()
                    .get()
                    .getDocuments();

            List<FinanceTransaction> list = new ArrayList<>();
            for (var snapshot : documents) {
                list.add(toTransaction(snapshot));
            }
            return list;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to find finance transactions by type", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to find finance transactions by type", exception);
        }
    }

    public List<FinanceTransaction> findByCategory(FinanceCategory category) {
        try {
            var documents = firestore.collection("financeTransactions")
                    .whereEqualTo("category", category.name())
                    .get()
                    .get()
                    .getDocuments();

            List<FinanceTransaction> list = new ArrayList<>();
            for (var snapshot : documents) {
                list.add(toTransaction(snapshot));
            }
            return list;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to find finance transactions by category", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to find finance transactions by category", exception);
        }
    }

    public FinanceTransaction update(String transactionId, UpdateFinanceTransactionRequest request) {
        DocumentReference document = firestore.collection("financeTransactions")
                .document(transactionId);

        Map<String, Object> updates = new HashMap<>();
        updates.put("category", request.category() != null ? request.category().name() : null);
        updates.put("description", request.description());
        updates.put("transactionDate", request.transactionDate() != null ? request.transactionDate().toString() : null);
        updates.put("updatedAt", Date.from(Instant.now()));

        try {
            document.update(updates).get();
            return findById(transactionId)
                    .orElseThrow(() -> new IllegalArgumentException("Finance transaction not found"));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to update finance transaction", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to update finance transaction", exception);
        }
    }

    public FinanceTransaction updateStatus(String transactionId, FinanceStatus status) {
        DocumentReference document = firestore.collection("financeTransactions")
                .document(transactionId);

        Map<String, Object> updates = new HashMap<>();
        updates.put("status", status.name());
        updates.put("updatedAt", Date.from(Instant.now()));

        try {
            document.update(updates).get();
            return findById(transactionId)
                    .orElseThrow(() -> new IllegalArgumentException("Finance transaction not found"));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to update finance transaction status", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to update finance transaction status", exception);
        }
    }

    public FinanceTransaction updateAmount(String transactionId, Double newAmount) {
        DocumentReference document = firestore.collection("financeTransactions")
                .document(transactionId);

        Map<String, Object> updates = new HashMap<>();
        updates.put("amount", newAmount);
        updates.put("updatedAt", Date.from(Instant.now()));

        try {
            document.update(updates).get();
            return findById(transactionId)
                    .orElseThrow(() -> new IllegalArgumentException("Finance transaction not found"));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to update finance transaction amount", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to update finance transaction amount", exception);
        }
    }

    public void delete(String transactionId) {
        DocumentReference document = firestore.collection("financeTransactions")
                .document(transactionId);

        try {
            document.delete().get();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to delete finance transaction", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to delete finance transaction", exception);
        }
    }

    private FinanceTransaction toTransaction(DocumentSnapshot snapshot) {
        FinanceTransaction transaction = new FinanceTransaction();
        transaction.setTransactionId(snapshot.getString("transactionId"));

        String typeStr = snapshot.getString("type");
        if (typeStr != null) {
            transaction.setType(FinanceTransactionType.valueOf(typeStr));
        }

        String categoryStr = snapshot.getString("category");
        if (categoryStr != null) {
            transaction.setCategory(FinanceCategory.valueOf(categoryStr));
        }

        transaction.setAmount(snapshot.getDouble("amount"));
        transaction.setDescription(snapshot.getString("description"));
        transaction.setReferenceId(snapshot.getString("referenceId"));

        String referenceTypeStr = snapshot.getString("referenceType");
        if (referenceTypeStr != null) {
            transaction.setReferenceType(FinanceReferenceType.valueOf(referenceTypeStr));
        }

        transaction.setPerformedBy(snapshot.getString("performedBy"));

        String transactionDateStr = snapshot.getString("transactionDate");
        if (transactionDateStr != null) {
            transaction.setTransactionDate(LocalDate.parse(transactionDateStr));
        }

        String statusStr = snapshot.getString("status");
        if (statusStr != null) {
            transaction.setStatus(FinanceStatus.valueOf(statusStr));
        }

        if (snapshot.getTimestamp("createdAt") != null) {
            transaction.setCreatedAt(snapshot.getTimestamp("createdAt").toDate().toInstant());
        }

        if (snapshot.getTimestamp("updatedAt") != null) {
            transaction.setUpdatedAt(snapshot.getTimestamp("updatedAt").toDate().toInstant());
        }

        return transaction;
    }
}

