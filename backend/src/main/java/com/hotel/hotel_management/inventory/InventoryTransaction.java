package com.hotel.hotel_management.inventory;

import java.time.Instant;

public class InventoryTransaction {

    private String transactionId;
    private String itemId;
    private InventoryTransactionType transactionType;
    private Double quantity;
    private Double previousQuantity;
    private Double newQuantity;
    private Double unitCost;
    private String reference;
    private String performedBy;
    private String notes;
    private Instant createdAt;

    public InventoryTransaction() {
    }

    public String getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(String transactionId) {
        this.transactionId = transactionId;
    }

    public String getItemId() {
        return itemId;
    }

    public void setItemId(String itemId) {
        this.itemId = itemId;
    }

    public InventoryTransactionType getTransactionType() {
        return transactionType;
    }

    public void setTransactionType(InventoryTransactionType transactionType) {
        this.transactionType = transactionType;
    }

    public Double getQuantity() {
        return quantity;
    }

    public void setQuantity(Double quantity) {
        this.quantity = quantity;
    }

    public Double getPreviousQuantity() {
        return previousQuantity;
    }

    public void setPreviousQuantity(Double previousQuantity) {
        this.previousQuantity = previousQuantity;
    }

    public Double getNewQuantity() {
        return newQuantity;
    }

    public void setNewQuantity(Double newQuantity) {
        this.newQuantity = newQuantity;
    }

    public Double getUnitCost() {
        return unitCost;
    }

    public void setUnitCost(Double unitCost) {
        this.unitCost = unitCost;
    }

    public String getReference() {
        return reference;
    }

    public void setReference(String reference) {
        this.reference = reference;
    }

    public String getPerformedBy() {
        return performedBy;
    }

    public void setPerformedBy(String performedBy) {
        this.performedBy = performedBy;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}

