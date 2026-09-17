export type InvoiceStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';

export interface Invoice {
  invoiceId: string;
  reservationId: string;
  customerUid: string;
  roomId: string;
  roomCharge: number;
  additionalCharges: number;
  discount: number;
  totalAmount: number;
  paidAmount?: number;
  remainingAmount?: number;
  status: InvoiceStatus;
  createdAt?: string;
  updatedAt?: string;
}

