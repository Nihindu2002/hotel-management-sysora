import type { UserRole } from '../../types/user';
import type {
  CategoryBreakdown,
  FinanceCategory,
  FinanceReferenceType,
  FinanceStatus,
  FinanceTransaction,
  FinanceTransactionType,
} from '../../types/finance';

// ── Type ──

export const TYPES: FinanceTransactionType[] = ['INCOME', 'EXPENSE'];

export const TYPE_BADGE: Record<
  FinanceTransactionType,
  { label: string; cls: string; sign: string; tone: string }
> = {
  INCOME: {
    label: 'Income',
    cls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    sign: '+',
    tone: 'text-emerald-600',
  },
  EXPENSE: {
    label: 'Expense',
    cls: 'bg-red-100 text-red-800 border-red-200',
    sign: '−',
    tone: 'text-red-600',
  },
};

// ── Category ──

export const CATEGORY_LABEL: Record<FinanceCategory, string> = {
  ROOM_REVENUE: 'Room Revenue',
  FOOD_REVENUE: 'Food & Beverage Revenue',
  OTHER_REVENUE: 'Other Revenue',
  INVENTORY: 'Inventory',
  SALARY: 'Salary',
  MAINTENANCE: 'Maintenance',
  UTILITIES: 'Utilities',
  RENT: 'Rent',
  MARKETING: 'Marketing',
  TAX: 'Tax',
  REFUND: 'Refund',
  OTHER: 'Other',
};

export const CATEGORIES: FinanceCategory[] = [
  'ROOM_REVENUE',
  'FOOD_REVENUE',
  'OTHER_REVENUE',
  'INVENTORY',
  'SALARY',
  'MAINTENANCE',
  'UTILITIES',
  'RENT',
  'MARKETING',
  'TAX',
  'REFUND',
  'OTHER',
];

/**
 * Mirrors the backend's INCOME_CATEGORIES / EXPENSE_CATEGORIES sets so the
 * filter dropdowns never offer a type/category pair the API would reject.
 */
export const INCOME_CATEGORIES: FinanceCategory[] = [
  'ROOM_REVENUE',
  'FOOD_REVENUE',
  'OTHER_REVENUE',
  'OTHER',
];

export const EXPENSE_CATEGORIES: FinanceCategory[] = [
  'INVENTORY',
  'SALARY',
  'MAINTENANCE',
  'UTILITIES',
  'RENT',
  'MARKETING',
  'TAX',
  'REFUND',
  'OTHER_REVENUE',
  'OTHER',
];

/** Categories offered once a type is chosen; all of them when it isn't. */
export const categoriesForType = (
  type: FinanceTransactionType | 'ALL'
): FinanceCategory[] => {
  if (type === 'INCOME') return INCOME_CATEGORIES;
  if (type === 'EXPENSE') return EXPENSE_CATEGORIES;
  return CATEGORIES;
};

// Narrowing helpers for values read out of the URL. A hand-typed or stale query
// string would otherwise put a filter control into a state where no option
// matches and every row is filtered out.

export const asTransactionType = (
  value: string | null
): FinanceTransactionType | 'ALL' =>
  TYPES.includes(value as FinanceTransactionType)
    ? (value as FinanceTransactionType)
    : 'ALL';

export const asCategory = (value: string | null): FinanceCategory | 'ALL' =>
  CATEGORIES.includes(value as FinanceCategory) ? (value as FinanceCategory) : 'ALL';

export const asStatus = (value: string | null): FinanceStatus | 'ALL' =>
  STATUSES.includes(value as FinanceStatus) ? (value as FinanceStatus) : 'ALL';

export const CATEGORY_BAR: Record<FinanceCategory, string> = {
  ROOM_REVENUE: 'bg-emerald-500',
  FOOD_REVENUE: 'bg-teal-500',
  OTHER_REVENUE: 'bg-lime-500',
  INVENTORY: 'bg-amber-500',
  SALARY: 'bg-indigo-500',
  MAINTENANCE: 'bg-orange-500',
  UTILITIES: 'bg-sky-500',
  RENT: 'bg-violet-500',
  MARKETING: 'bg-pink-500',
  TAX: 'bg-rose-500',
  REFUND: 'bg-red-500',
  OTHER: 'bg-gray-400',
};

/**
 * Safe lookups for a transaction's category. `PUT /api/finance/transactions/{id}`
 * writes null over the field when a partial update omits it, so a stored record
 * can legitimately have no category — indexing the maps directly would render a
 * blank cell or an `undefined` Tailwind class.
 */
export const categoryLabel = (category?: FinanceCategory | null): string =>
  (category && CATEGORY_LABEL[category]) || 'Uncategorised';

export const categoryBar = (category?: FinanceCategory | null): string =>
  (category && CATEGORY_BAR[category]) || 'bg-gray-300';

// ── Status ──

export const STATUSES: FinanceStatus[] = ['ACTIVE', 'CANCELLED'];

export const STATUS_BADGE: Record<
  FinanceStatus,
  { label: string; cls: string; dot: string }
> = {
  ACTIVE: {
    label: 'Active',
    cls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  CANCELLED: {
    label: 'Cancelled',
    cls: 'bg-gray-100 text-gray-700 border-gray-300',
    dot: 'bg-gray-400',
  },
};

// ── Reference ──

export const REFERENCE_TYPE_LABEL: Record<FinanceReferenceType, string> = {
  PAYMENT: 'Payment',
  PAYMENT_REFUND: 'Payment Refund',
  INVENTORY: 'Inventory Transaction',
  INVENTORY_TRANSACTION: 'Inventory Transaction',
  STAFF: 'Staff Record',
  MAINTENANCE: 'Maintenance Task',
  MAINTENANCE_TASK: 'Maintenance Task',
  OTHER: 'Other',
};

/** Which module produced the record, shown next to the reference ID. */
export const REFERENCE_SOURCE: Record<FinanceReferenceType, string> = {
  PAYMENT: 'Payment module',
  PAYMENT_REFUND: 'Payment module',
  INVENTORY: 'Inventory module',
  INVENTORY_TRANSACTION: 'Inventory module',
  STAFF: 'Staff module',
  MAINTENANCE: 'Maintenance module',
  MAINTENANCE_TASK: 'Maintenance module',
  OTHER: 'No linked module',
};

/** Explains *why* the ledger row exists, so the origin is never a mystery. */
export const REFERENCE_TRIGGER: Record<FinanceReferenceType, string> = {
  PAYMENT: 'Recorded automatically when a customer payment completed.',
  PAYMENT_REFUND: 'Recorded automatically when a completed payment was refunded.',
  INVENTORY_TRANSACTION:
    'Recorded automatically when stock was received (quantity × unit cost).',
  INVENTORY:
    'Recorded automatically when stock was received (quantity × unit cost).',
  MAINTENANCE_TASK:
    'Recorded automatically when a maintenance task was completed with an actual cost.',
  MAINTENANCE:
    'Recorded automatically when a maintenance task was completed with an actual cost.',
  STAFF: 'Recorded from a staff payroll entry.',
  OTHER: 'Entered manually or without a linked source record.',
};

/**
 * Deep link from a ledger row back to the record that produced it.
 *
 * `roles` mirrors the route guards in App.tsx, and the backend enforces the same
 * split — an ACCOUNTANT may read /api/finance but not /api/inventory or
 * /api/maintenance/tasks/{id}. Linking a role to a page it cannot open would
 * bounce it to /unauthorized, so callers hide the link instead.
 */
const REFERENCE_LINK: Partial<
  Record<
    FinanceReferenceType,
    { label: string; roles: UserRole[]; path: (referenceId: string) => string }
  >
> = {
  PAYMENT: {
    label: 'View payments',
    roles: ['ADMIN', 'RECEPTIONIST', 'ACCOUNTANT'],
    path: () => '/payments',
  },
  PAYMENT_REFUND: {
    label: 'View payments',
    roles: ['ADMIN', 'RECEPTIONIST', 'ACCOUNTANT'],
    path: () => '/payments',
  },
  INVENTORY_TRANSACTION: {
    label: 'View inventory',
    roles: [
      'ADMIN',
      'MANAGER',
      'RECEPTIONIST',
      'STAFF',
      'HOUSEKEEPING',
      'MAINTENANCE',
    ],
    path: () => '/inventory/items',
  },
  INVENTORY: {
    label: 'View inventory',
    roles: [
      'ADMIN',
      'MANAGER',
      'RECEPTIONIST',
      'STAFF',
      'HOUSEKEEPING',
      'MAINTENANCE',
    ],
    path: () => '/inventory/items',
  },
  MAINTENANCE_TASK: {
    label: 'View maintenance task',
    roles: ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'MAINTENANCE'],
    path: (referenceId) => `/maintenance/tasks/${referenceId}`,
  },
  MAINTENANCE: {
    label: 'View maintenance task',
    roles: ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'MAINTENANCE'],
    path: (referenceId) => `/maintenance/tasks/${referenceId}`,
  },
};

export interface ReferenceLink {
  label: string;
  path: string;
}

export const referenceLink = (
  referenceType?: FinanceReferenceType | null,
  referenceId?: string | null,
  role?: UserRole | null
): ReferenceLink | null => {
  if (!referenceType || !referenceId || !role) return null;

  const config = REFERENCE_LINK[referenceType];
  if (!config || !config.roles.includes(role)) return null;

  return { label: config.label, path: config.path(referenceId) };
};

// ── Aggregation ──

/**
 * Totals per category for one side of the ledger.
 *
 * Only `ACTIVE` rows are counted, which is exactly the filter the backend
 * applies in getFinancialSummary — without it the breakdown would disagree with
 * the headline totals whenever a transaction is cancelled.
 */
export const summarizeByCategory = (
  transactions: FinanceTransaction[],
  type: FinanceTransactionType
): CategoryBreakdown[] => {
  const totals = new Map<FinanceCategory | null, CategoryBreakdown>();

  transactions
    .filter((t) => t.status === 'ACTIVE' && t.type === type)
    .forEach((transaction) => {
      const amount = transaction.amount ?? 0;
      const existing = totals.get(transaction.category);

      if (existing) {
        existing.amount += amount;
        existing.count += 1;
      } else {
        totals.set(transaction.category, {
          category: transaction.category,
          amount,
          count: 1,
        });
      }
    });

  return [...totals.values()].sort((a, b) => b.amount - a.amount);
};

/** Newest first, by calendar day then by the moment the row was written. */
export const sortByNewest = (
  transactions: FinanceTransaction[]
): FinanceTransaction[] =>
  [...transactions].sort((a, b) => {
    const byDate = (b.transactionDate ?? '').localeCompare(a.transactionDate ?? '');
    if (byDate !== 0) return byDate;
    return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
  });

// ── Dates ──

/** Builds `YYYY-MM-DD` from local parts; `toISOString` would shift the day. */
const toIsoDate = (date: Date): string => {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

/** Inclusive bounds covering the current calendar month. */
export const currentMonthRange = (): { startDate: string; endDate: string } => {
  const now = new Date();
  return {
    startDate: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    // Day 0 of next month is the last day of this one.
    endDate: toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
};

export const currentMonthLabel = (): string =>
  new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

/**
 * `transactionDate` is a bare calendar day. `new Date('2026-09-17')` parses it
 * as UTC midnight, which renders as the 16th in any negative-offset timezone,
 * so split the string and build a local date instead.
 */
export const formatDate = (value?: string | null): string => {
  if (!value) return '—';

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (value?: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ── Money ──

export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '—';
  return `LKR ${amount.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/** Currency with an explicit +/− so the ledger reads correctly at a glance. */
export const formatSignedAmount = (
  amount: number | null | undefined,
  type: FinanceTransactionType
): string => `${TYPE_BADGE[type].sign} ${formatCurrency(amount)}`;

export const formatCount = (count: number): string =>
  count === 1 ? '1 transaction' : `${count} transactions`;
