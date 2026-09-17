export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT';

export interface CreateReservationRequest {
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
}

export interface Reservation {
  reservationId: string;
  customerUid: string;
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  status: ReservationStatus;
  createdAt?: string;
  updatedAt?: string;
}

