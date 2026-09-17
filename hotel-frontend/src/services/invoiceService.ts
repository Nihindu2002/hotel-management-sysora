import api from './api';
import type { Invoice } from '../types/invoice';

/**
 * Retrieves all invoices for the authenticated customer.
 * Uses: GET /api/invoices/my
 */
export const getMyInvoices = async (): Promise<Invoice[]> => {
  const response = await api.get<Invoice[]>('/invoices/my');
  return response.data;
};

/**
 * Retrieves full details for a specific invoice.
 * Uses: GET /api/invoices/{invoiceId}
 */
export const getInvoiceById = async (invoiceId: string): Promise<Invoice> => {
  const response = await api.get<Invoice>(`/invoices/${invoiceId}`);
  return response.data;
};

/**
 * Retrieves invoice associated with a reservation.
 * Uses: GET /api/invoices/reservation/{reservationId}
 */
export const getInvoiceByReservationId = async (
  reservationId: string
): Promise<Invoice | null> => {
  try {
    const response = await api.get<Invoice>(`/invoices/reservation/${reservationId}`);
    return response.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return null;
    }
    throw err;
  }
};

