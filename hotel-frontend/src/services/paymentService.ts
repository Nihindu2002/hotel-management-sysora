import api from './api';
import type { CreatePaymentRequest, Payment } from '../types/payment';

/**
 * Records a customer payment against an invoice.
 * Uses: POST /api/payments
 */
export const createPayment = async (
  data: CreatePaymentRequest
): Promise<Payment> => {
  const response = await api.post<Payment>('/payments', data);
  return response.data;
};

/**
 * Retrieves all payments for the authenticated customer.
 * Uses: GET /api/payments/my (fallback: GET /api/customer/payments)
 */
export const getMyPayments = async (): Promise<Payment[]> => {
  try {
    const response = await api.get<Payment[]>('/payments/my');
    return response.data;
  } catch {
    const fallback = await api.get<Payment[]>('/customer/payments');
    return fallback.data;
  }
};

/**
 * Retrieves payment history for a specific invoice.
 * Uses: GET /api/payments/invoice/{invoiceId}
 */
export const getPaymentsByInvoice = async (
  invoiceId: string
): Promise<Payment[]> => {
  const response = await api.get<Payment[]>(`/payments/invoice/${invoiceId}`);
  return response.data;
};

/**
 * Retrieves payment details by payment ID.
 * Uses: GET /api/payments/{paymentId}
 */
export const getPaymentById = async (paymentId: string): Promise<Payment> => {
  const response = await api.get<Payment>(`/payments/${paymentId}`);
  return response.data;
};

