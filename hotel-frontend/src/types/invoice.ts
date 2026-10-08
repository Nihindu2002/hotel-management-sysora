import type { BoardPackageCode } from './reservation';

export type InvoiceStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';

export type DiscountType = 'NONE' | 'FIXED' | 'PERCENTAGE';

/** One non-room line on the bill, e.g. an extra bed or laundry. */
export interface AdditionalCharge {
  description: string;
  amount: number;
}

/**
 * A bill, exactly as the backend priced it.
 *
 * Every figure here is computed server-side. The UI renders these values rather
 * than recalculating them, so what the desk sees is what the hotel will charge.
 */
export interface Invoice {
  invoiceId: string;
  reservationId: string;
  roomId: string;
  roomNumber?: string | null;
  customerName?: string | null;
  boardPackage?: BoardPackageCode | null;
  packagePricePerNight?: number | null;

  checkInDate?: string | null;
  checkOutDate?: string | null;
  nights?: number | null;

  roomCharge: number;
  additionalCharges: AdditionalCharge[];
  additionalChargesTotal: number;

  discountType: DiscountType;
  /** As entered: a currency amount for FIXED, a percentage for PERCENTAGE. */
  discountValue: number;
  /** What the discount actually took off. */
  discountAmount: number;

  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;

  paidAmount?: number;
  remainingAmount?: number;

  status: InvoiceStatus;
  createdAt?: string;
  updatedAt?: string;
}

/** What the desk sends to have a bill priced. Never carries a total. */
export interface GenerateBillRequest {
  additionalCharges: AdditionalCharge[];
  discountType: DiscountType;
  discountValue: number;
}
