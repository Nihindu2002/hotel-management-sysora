package com.hotel.hotel_management.dashboard;

/**
 * Aggregate view of money owed to the hotel.
 *
 * An invoice is "outstanding" when its remaining balance is greater than zero,
 * which covers both UNPAID and PARTIALLY_PAID invoices.
 */
public record InvoiceOutstandingResponse(
        long totalInvoices,
        long outstandingInvoices,
        long paidInvoices,
        double totalInvoiced,
        double totalPaid,
        double totalOutstanding
) {
}
