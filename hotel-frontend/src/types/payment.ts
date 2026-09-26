export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'ONLINE';

export type PaymentStatus = 'COMPLETED' | 'PENDING' | 'FAILED' | 'REFUNDED';

/** A payment taken at the desk. The backend validates it against the balance. */
export interface CreatePaymentRequest {
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
}

export interface Payment {
  paymentId: string;
  invoiceId: string;
  reservationId: string;
  amount: number;
  paymentMethod: PaymentMethod | string;
  status: PaymentStatus | string;
  /** Firebase uid of the staff member who recorded it. */
  recordedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
