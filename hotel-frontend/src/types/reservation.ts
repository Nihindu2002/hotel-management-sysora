export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT';

/**
 * A booking taken at the front desk.
 *
 * The occupant's details live on the reservation — there is no separate guest
 * record and no customer account behind it.
 */
export interface Reservation {
  reservationId: string;
  roomId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  /** Firebase uid of the staff member who took the booking. */
  createdBy?: string | null;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  status: ReservationStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateReservationRequest {
  roomId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
}

/** The outcome of a completed checkout. */
export interface CheckoutResponse {
  reservation: Reservation;
  invoice: import('./invoice').Invoice;
}
