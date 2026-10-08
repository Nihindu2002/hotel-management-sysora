package com.hotel.hotel_management.invoice;

import com.hotel.hotel_management.reservation.BoardPackage;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * The bill for one reservation.
 *
 * Every monetary field here is written by the backend from figures it looked up
 * itself — the room's price, the reservation's dates, the charge lines the desk
 * entered. The stored breakdown is what the frontend renders, so an invoice
 * printed a year later still shows exactly how its total was reached.
 */
public class Invoice {

    private String invoiceId;
    private String reservationId;
    private String roomId;
    private String roomNumber;
    private String customerName;
    private BoardPackage boardPackage;
    private Double packagePricePerNight;

    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private Long nights;

    private Double roomCharge;
    private List<AdditionalCharge> additionalCharges = new ArrayList<>();
    private Double additionalChargesTotal;

    private DiscountType discountType;
    /** As entered: a currency amount for FIXED, a percentage for PERCENTAGE. */
    private Double discountValue;
    /** What the discount actually took off, in currency. */
    private Double discountAmount;

    private Double subtotal;
    private Double taxRate;
    private Double taxAmount;
    private Double totalAmount;

    private Double paidAmount;
    private Double remainingAmount;

    private String status;

    private Instant createdAt;
    private Instant updatedAt;

    public String getInvoiceId() {
        return invoiceId;
    }

    public void setInvoiceId(String invoiceId) {
        this.invoiceId = invoiceId;
    }

    public String getReservationId() {
        return reservationId;
    }

    public void setReservationId(String reservationId) {
        this.reservationId = reservationId;
    }

    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public String getRoomNumber() {
        return roomNumber;
    }

    public void setRoomNumber(String roomNumber) {
        this.roomNumber = roomNumber;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public BoardPackage getBoardPackage() {
        return boardPackage;
    }

    public void setBoardPackage(BoardPackage boardPackage) {
        this.boardPackage = boardPackage;
    }

    public Double getPackagePricePerNight() {
        return packagePricePerNight;
    }

    public void setPackagePricePerNight(Double packagePricePerNight) {
        this.packagePricePerNight = packagePricePerNight;
    }

    public LocalDate getCheckInDate() {
        return checkInDate;
    }

    public void setCheckInDate(LocalDate checkInDate) {
        this.checkInDate = checkInDate;
    }

    public LocalDate getCheckOutDate() {
        return checkOutDate;
    }

    public void setCheckOutDate(LocalDate checkOutDate) {
        this.checkOutDate = checkOutDate;
    }

    public Long getNights() {
        return nights;
    }

    public void setNights(Long nights) {
        this.nights = nights;
    }

    public Double getRoomCharge() {
        return roomCharge;
    }

    public void setRoomCharge(Double roomCharge) {
        this.roomCharge = roomCharge;
    }

    public List<AdditionalCharge> getAdditionalCharges() {
        return additionalCharges;
    }

    public void setAdditionalCharges(List<AdditionalCharge> additionalCharges) {
        this.additionalCharges = additionalCharges != null ? additionalCharges : new ArrayList<>();
    }

    public Double getAdditionalChargesTotal() {
        return additionalChargesTotal;
    }

    public void setAdditionalChargesTotal(Double additionalChargesTotal) {
        this.additionalChargesTotal = additionalChargesTotal;
    }

    public DiscountType getDiscountType() {
        return discountType;
    }

    public void setDiscountType(DiscountType discountType) {
        this.discountType = discountType;
    }

    public Double getDiscountValue() {
        return discountValue;
    }

    public void setDiscountValue(Double discountValue) {
        this.discountValue = discountValue;
    }

    public Double getDiscountAmount() {
        return discountAmount;
    }

    public void setDiscountAmount(Double discountAmount) {
        this.discountAmount = discountAmount;
    }

    public Double getSubtotal() {
        return subtotal;
    }

    public void setSubtotal(Double subtotal) {
        this.subtotal = subtotal;
    }

    public Double getTaxRate() {
        return taxRate;
    }

    public void setTaxRate(Double taxRate) {
        this.taxRate = taxRate;
    }

    public Double getTaxAmount() {
        return taxAmount;
    }

    public void setTaxAmount(Double taxAmount) {
        this.taxAmount = taxAmount;
    }

    public Double getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(Double totalAmount) {
        this.totalAmount = totalAmount;
    }

    public Double getPaidAmount() {
        return paidAmount;
    }

    public void setPaidAmount(Double paidAmount) {
        this.paidAmount = paidAmount;
    }

    public Double getRemainingAmount() {
        return remainingAmount;
    }

    public void setRemainingAmount(Double remainingAmount) {
        this.remainingAmount = remainingAmount;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
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
