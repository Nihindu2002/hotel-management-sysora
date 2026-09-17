import api from './api';
import type { CreateReservationRequest, Reservation } from '../types/reservation';

/**
 * Creates a new customer reservation.
 * Authenticated Firebase user token is automatically attached by axios interceptor.
 */
export const createReservation = async (
  data: CreateReservationRequest
): Promise<Reservation> => {
  const response = await api.post<Reservation>('/reservations', data);
  return response.data;
};

/**
 * Retrieves all reservations belonging to the authenticated customer.
 */
export const getMyReservations = async (): Promise<Reservation[]> => {
  const response = await api.get<Reservation[]>('/reservations/my');
  return response.data;
};

/**
 * Cancels a reservation on behalf of the customer.
 * Uses customer endpoint: PATCH /api/reservations/{reservationId}/cancel.
 */
export const cancelCustomerReservation = async (
  reservationId: string
): Promise<Reservation> => {
  const response = await api.patch<Reservation>(
    `/reservations/${reservationId}/cancel`
  );
  return response.data;
};

/**
 * Retrieves details for a specific reservation.
 */
export const getReservationById = async (
  reservationId: string
): Promise<Reservation> => {
  const response = await api.get<Reservation>(`/reservations/${reservationId}`);
  return response.data;
};

/**
 * Retrieves all reservations across the hotel (Staff/Admin/Manager).
 */
export const getAllReservations = async (): Promise<Reservation[]> => {
  const response = await api.get<Reservation[]>('/reservations');
  return response.data;
};

/**
 * Confirms a pending reservation (Staff only: ADMIN, MANAGER, RECEPTIONIST).
 * Auto-creates invoice in the backend.
 */
export const confirmReservation = async (
  reservationId: string
): Promise<Reservation> => {
  const response = await api.patch<Reservation>(
    `/reservations/${reservationId}/confirm`
  );
  return response.data;
};

/**
 * Cancels a reservation on behalf of hotel staff (ADMIN, MANAGER, RECEPTIONIST).
 */
export const cancelReservationByStaff = async (
  reservationId: string
): Promise<Reservation> => {
  const response = await api.patch<Reservation>(
    `/reservations/${reservationId}/cancel-by-staff`
  );
  return response.data;
};

/**
 * Checks in a confirmed guest (ADMIN, MANAGER, RECEPTIONIST).
 */
export const checkInReservation = async (
  reservationId: string
): Promise<Reservation> => {
  const response = await api.patch<Reservation>(
    `/reservations/${reservationId}/check-in`
  );
  return response.data;
};

/**
 * Checks out a guest (ADMIN, MANAGER, RECEPTIONIST).
 */
export const checkOutReservation = async (
  reservationId: string
): Promise<Reservation> => {
  const response = await api.patch<Reservation>(
    `/reservations/${reservationId}/check-out`
  );
  return response.data;
};


