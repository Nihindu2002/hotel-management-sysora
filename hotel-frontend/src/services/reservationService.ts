import api from './api';
import type {
  CheckoutResponse,
  CreateReservationRequest,
  Reservation,
} from '../types/reservation';
import type { GenerateBillRequest, Invoice } from '../types/invoice';
import type { Room } from '../types/room';

/** Takes a booking at the desk. Comes back CONFIRMED with an invoice opened. */
export const createReservation = async (
  data: CreateReservationRequest,
): Promise<Reservation> => {
  const response = await api.post<Reservation>('/reservations', data);
  return response.data;
};

/** Every reservation. */
export const getAllReservations = async (): Promise<Reservation[]> => {
  const response = await api.get<Reservation[]>('/reservations');
  return response.data;
};

export const getReservationById = async (
  reservationId: string,
): Promise<Reservation> => {
  const response = await api.get<Reservation>(
    `/reservations/${reservationId}`,
  );
  return response.data;
};

export const cancelReservationByStaff = async (
  reservationId: string,
): Promise<Reservation> => {
  const response = await api.patch<Reservation>(
    `/reservations/${reservationId}/cancel-by-staff`,
  );
  return response.data;
};

/** Kept for reservations taken before desk bookings became confirmed on the spot. */
export const confirmReservation = async (
  reservationId: string,
): Promise<Reservation> => {
  const response = await api.patch<Reservation>(
    `/reservations/${reservationId}/confirm`,
  );
  return response.data;
};

/** Checks the guest in. The room becomes OCCUPIED server-side. */
export const checkInReservation = async (
  reservationId: string,
): Promise<Reservation> => {
  const response = await api.patch<Reservation>(
    `/reservations/${reservationId}/check-in`,
  );
  return response.data;
};

/**
 * Rooms with no conflicting stay for the date range.
 *
 * Availability is decided by the backend from real reservations, so this is the
 * only answer the desk should trust.
 */
export const getAvailableRooms = async (
  checkInDate: string,
  checkOutDate: string,
  numberOfGuests?: number,
): Promise<Room[]> => {
  const response = await api.get<Room[]>('/reservations/availability', {
    params: { checkInDate, checkOutDate, numberOfGuests },
  });
  return response.data;
};

/**
 * Prices the stay and stores the result.
 *
 * The request carries charges and a discount only — never a total. Everything
 * on the returned invoice was calculated by the backend.
 */
export const generateFinalBill = async (
  reservationId: string,
  bill: GenerateBillRequest,
): Promise<Invoice> => {
  const response = await api.post<Invoice>(
    `/reservations/${reservationId}/bill`,
    bill,
  );
  return response.data;
};

/** The stay's current bill, or null if none has been opened. */
export const getBill = async (
  reservationId: string,
): Promise<Invoice | null> => {
  try {
    const response = await api.get<Invoice>(`/reservations/${reservationId}/bill`);
    return response.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return null;
    }
    throw err;
  }
};

/**
 * Finalises checkout: the stay becomes CHECKED_OUT, the room CLEANING, and a
 * housekeeping task is raised.
 */
export const checkOutReservation = async (
  reservationId: string,
): Promise<CheckoutResponse> => {
  const response = await api.post<CheckoutResponse>(
    `/reservations/${reservationId}/check-out`,
  );
  return response.data;
};
