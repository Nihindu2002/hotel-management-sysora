import api from './api';
import type { CreatePaymentRequest, Payment } from '../types/payment';

/**
 * Records a payment against an invoice.
 *
 * The backend checks the amount against the outstanding balance, updates the
 * invoice status, and writes the matching finance income entry. None of those
 * are done here.
 */
export const createPayment = async (
  data: CreatePaymentRequest,
): Promise<Payment> => {
  const response = await api.post<Payment>('/payments', data);
  return response.data;
};

/** Payments recorded against one invoice. */
export const getPaymentsByInvoice = async (
  invoiceId: string,
): Promise<Payment[]> => {
  const response = await api.get<Payment[]>(`/payments/invoice/${invoiceId}`);
  return response.data;
};

export const getPaymentById = async (paymentId: string): Promise<Payment> => {
  const response = await api.get<Payment>(`/payments/${paymentId}`);
  return response.data;
};

/** Every payment across the hotel. */
export const getAllPayments = async (): Promise<Payment[]> => {
  const response = await api.get<Payment[]>('/payments');
  return response.data;
};

/** Refunds a completed payment; the invoice and finance ledger follow. */
export const refundPayment = async (paymentId: string): Promise<Payment> => {
  const response = await api.patch<Payment>(`/payments/${paymentId}/refund`);
  return response.data;
};
