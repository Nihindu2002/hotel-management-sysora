export type FinanceTransactionType = 'INCOME' | 'EXPENSE';

export type FinanceCategory =
  | 'ROOM_REVENUE'
  | 'FOOD_REVENUE'
  | 'OTHER_REVENUE'
  | 'INVENTORY'
  | 'SALARY'
  | 'MAINTENANCE'
  | 'UTILITIES'
  | 'RENT'
  | 'MARKETING'
  | 'TAX'
  | 'REFUND'
  | 'OTHER';

/**
 * Finance records are never deleted: cancelling flips the status and the
 * transaction drops out of all summary totals while staying auditable.
 */
export type FinanceStatus = 'ACTIVE' | 'CANCELLED';

/**
 * What generated the transaction. Every value except `OTHER` points at a record
 * owned by another module (a payment, an inventory movement, a maintenance
 * task), which is what makes the ledger reconcilable back to its source.
 */
export type FinanceReferenceType =
  | 'PAYMENT'
  | 'PAYMENT_REFUND'
  | 'INVENTORY'
  | 'INVENTORY_TRANSACTION'
  | 'STAFF'
  | 'MAINTENANCE'
  | 'MAINTENANCE_TASK'
  | 'OTHER';

export interface FinanceTransaction {
  transactionId: string;
  type: FinanceTransactionType;
  /**
   * The API can return null here: `PUT /transactions/{id}` overwrites the field
   * with null when a partial update omits it. Render through `categoryLabel()`
   * rather than indexing CATEGORY_LABEL directly.
   */
  category: FinanceCategory | null;
  amount: number;
  description: string;
  referenceId?: string | null;
  referenceType?: FinanceReferenceType | null;
  performedBy?: string | null;
  /** Plain `YYYY-MM-DD` — a calendar day, not an instant. */
  transactionDate: string;
  status: FinanceStatus;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Totals cover only `ACTIVE` transactions, so a cancelled record never inflates
 * income or expenses.
 */
export interface FinanceSummary {
  startDate?: string | null;
  endDate?: string | null;
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
}

export interface FinanceTransactionFilters {
  type?: FinanceTransactionType | 'ALL';
  category?: FinanceCategory | 'ALL';
  status?: FinanceStatus | 'ALL';
  /** Inclusive `YYYY-MM-DD` bounds. */
  startDate?: string;
  endDate?: string;
  /** Matches against description or reference ID. */
  search?: string;
}

export interface CategoryBreakdown {
  /** Null when a partially-applied update cleared the category on the record. */
  category: FinanceCategory | null;
  amount: number;
  count: number;
}

/**
 * There is deliberately no create/update request type here. Transactions are
 * written by the backend when a payment completes, stock is received, or a
 * maintenance task is completed with a cost — the Finance UI is read-only and
 * must never post to /api/finance to avoid double-counting those modules.
 */
