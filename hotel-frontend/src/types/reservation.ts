export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT';

export type BoardPackageCode =
  | 'ROOM_ONLY'
  | 'BED_AND_BREAKFAST'
  | 'HALF_BOARD'
  | 'FULL_BOARD';

export interface BoardPackageOption {
  code: BoardPackageCode;
  label: string;
  mealsIncluded: string;
  premiumPerNight: number;
}

export const BOARD_PACKAGE_DETAILS: Record<
  BoardPackageCode,
  { label: string; mealsIncluded: string }
> = {
  ROOM_ONLY: { label: 'Room Only', mealsIncluded: 'Accommodation only' },
  BED_AND_BREAKFAST: {
    label: 'Bed & Breakfast',
    mealsIncluded: 'Breakfast included',
  },
  HALF_BOARD: {
    label: 'Half Board',
    mealsIncluded: 'Breakfast and dinner included',
  },
  FULL_BOARD: {
    label: 'Full Board',
    mealsIncluded: 'Breakfast, lunch and dinner included',
  },
};

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
  boardPackage?: BoardPackageCode | null;
  packagePricePerNight?: number | null;
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
  boardPackage: BoardPackageCode;
}

/** The outcome of a completed checkout. */
export interface CheckoutResponse {
  reservation: Reservation;
  invoice: import('./invoice').Invoice;
}
