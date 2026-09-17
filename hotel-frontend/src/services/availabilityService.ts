import api from './api';
import type { Room } from '../types/room';
import type { AvailabilitySearchParams } from '../types/availability';

/**
 * Service to handle room availability checks.
 * Calls backend GET /api/reservations/availability with exact parameter names:
 * checkInDate, checkOutDate, numberOfGuests.
 */
export const getAvailableRooms = async (
  params: AvailabilitySearchParams
): Promise<Room[]> => {
  const response = await api.get<Room[]>('/reservations/availability', {
    params: {
      checkInDate: params.checkInDate,
      checkOutDate: params.checkOutDate,
      numberOfGuests: params.numberOfGuests,
    },
  });

  return response.data;
};

