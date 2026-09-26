import api from './api';
import type { Invoice } from '../types/invoice';

/** Every invoice in the hotel, with paid and remaining amounts filled in. */
export const getAllInvoices = async (): Promise<Invoice[]> => {
  const response = await api.get<Invoice[]>('/invoices');
  return response.data;
};

export const getInvoiceById = async (invoiceId: string): Promise<Invoice> => {
  const response = await api.get<Invoice>(`/invoices/${invoiceId}`);
  return response.data;
};

/** The invoice for a reservation, or null when nobody has billed the stay. */
export const getInvoiceByReservationId = async (
  reservationId: string,
): Promise<Invoice | null> => {
  try {
    const response = await api.get<Invoice>(
      `/invoices/reservation/${reservationId}`,
    );
    return response.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return null;
    }
    throw err;
  }
};

/** Recomputes UNPAID / PARTIALLY_PAID / PAID from recorded payments. */
export const recalculateInvoiceStatus = async (
  invoiceId: string,
): Promise<Invoice> => {
  const response = await api.patch<Invoice>(
    `/invoices/${invoiceId}/recalculate`,
  );
  return response.data;
};
