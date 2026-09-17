export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'ONLINE';

export type PaymentStatus = 'COMPLETED' | 'PENDING' | 'FAILED' | 'REFUNDED';

export interface CreatePaymentRequest {
  invoiceId: string;
  reservationId?: string;
  amount: number;
  paymentMethod: PaymentMethod;
}

export interface Payment {
  paymentId: string;
  invoiceId: string;
  reservationId: string;
  customerUid: string;
  amount: number;
  paymentMethod: PaymentMethod | string;
  status: PaymentStatus | string;
  createdAt?: string;
  updatedAt?: string;
}

