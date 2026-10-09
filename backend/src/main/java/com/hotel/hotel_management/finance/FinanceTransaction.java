package com.hotel.hotel_management.finance;

import java.time.Instant;
import java.time.LocalDate;

public class FinanceTransaction {

    private String transactionId;
    private FinanceTransactionType type;
    private FinanceCategory category;
    private Double amount;
    private String description;
    private String referenceId;
    private FinanceReferenceType referenceType;
    private String performedBy;
    private LocalDate transactionDate;
    private FinanceStatus status;
    private Instant createdAt;
    private Instant updatedAt;

    public String getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(String transactionId) {
        this.transactionId = transactionId;
    }

    public FinanceTransactionType getType() {
        return type;
    }

    public void setType(FinanceTransactionType type) {
        this.type = type;
    }

    public FinanceCategory getCategory() {
        return category;
    }

    public void setCategory(FinanceCategory category) {
        this.category = category;
    }

    public Double getAmount() {
        return amount;
    }

    public void setAmount(Double amount) {
        this.amount = amount;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getReferenceId() {
        return referenceId;
    }

    public void setReferenceId(String referenceId) {
        this.referenceId = referenceId;
    }

    public FinanceReferenceType getReferenceType() {
        return referenceType;
    }

    public void setReferenceType(FinanceReferenceType referenceType) {
        this.referenceType = referenceType;
    }

    public String getPerformedBy() {
        return performedBy;
    }

    public void setPerformedBy(String performedBy) {
        this.performedBy = performedBy;
    }

    public LocalDate getTransactionDate() {
        return transactionDate;
    }

    public void setTransactionDate(LocalDate transactionDate) {
        this.transactionDate = transactionDate;
    }

    public FinanceStatus getStatus() {
        return status;
    }

    public void setStatus(FinanceStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}

