import type {
  InventoryCategory,
  InventoryStatus,
  InventoryTransactionType,
  InventoryUnit,
} from '../../types/inventory';

export const CATEGORY_LABEL: Record<InventoryCategory, string> = {
  LINEN: 'Linen',
  TOILETRIES: 'Toiletries',
  CLEANING_SUPPLIES: 'Cleaning Supplies',
  MAINTENANCE_SUPPLIES: 'Maintenance Supplies',
  OFFICE_SUPPLIES: 'Office Supplies',
  FOOD: 'Food',
  BEVERAGE: 'Beverage',
  OTHER: 'Other',
};

export const CATEGORIES: InventoryCategory[] = [
  'LINEN',
  'TOILETRIES',
  'CLEANING_SUPPLIES',
  'MAINTENANCE_SUPPLIES',
  'OFFICE_SUPPLIES',
  'FOOD',
  'BEVERAGE',
  'OTHER',
];

export const UNIT_LABEL: Record<InventoryUnit, string> = {
  PIECE: 'Piece',
  BOX: 'Box',
  PACK: 'Pack',
  KG: 'Kilogram',
  GRAM: 'Gram',
  LITER: 'Litre',
  MILLILITER: 'Millilitre',
  BOTTLE: 'Bottle',
  CAN: 'Can',
  OTHER: 'Other',
};

/** Short form used next to quantities, e.g. "30 pcs". */
export const UNIT_ABBR: Record<InventoryUnit, string> = {
  PIECE: 'pcs',
  BOX: 'boxes',
  PACK: 'packs',
  KG: 'kg',
  GRAM: 'g',
  LITER: 'L',
  MILLILITER: 'ml',
  BOTTLE: 'btl',
  CAN: 'cans',
  OTHER: 'units',
};

export const UNITS: InventoryUnit[] = [
  'PIECE',
  'BOX',
  'PACK',
  'KG',
  'GRAM',
  'LITER',
  'MILLILITER',
  'BOTTLE',
  'CAN',
  'OTHER',
];

export const STATUSES: InventoryStatus[] = ['ACTIVE', 'INACTIVE'];

export const STATUS_BADGE: Record<InventoryStatus, { label: string; cls: string; dot: string }> = {
  ACTIVE: {
    label: 'Active',
    cls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  INACTIVE: {
    label: 'Inactive',
    cls: 'bg-gray-100 text-gray-700 border-gray-200',
    dot: 'bg-gray-400',
  },
};

export const TRANSACTION_BADGE: Record<
  InventoryTransactionType,
  { label: string; cls: string; sign: string }
> = {
  STOCK_IN: {
    label: 'Stock In',
    cls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    sign: '+',
  },
  STOCK_OUT: {
    label: 'Stock Out',
    cls: 'bg-amber-100 text-amber-800 border-amber-200',
    sign: '−',
  },
  ADJUSTMENT: {
    label: 'Adjustment',
    cls: 'bg-blue-100 text-blue-800 border-blue-200',
    sign: '±',
  },
};

export type StockLevel = 'OUT_OF_STOCK' | 'LOW' | 'HEALTHY';

export const stockLevel = (quantity: number, minimumStock: number): StockLevel => {
  if (quantity <= 0) return 'OUT_OF_STOCK';
  if (quantity <= minimumStock) return 'LOW';
  return 'HEALTHY';
};

export const STOCK_LEVEL_BADGE: Record<StockLevel, { label: string; cls: string }> = {
  OUT_OF_STOCK: { label: 'Out of Stock', cls: 'bg-red-100 text-red-800 border-red-200' },
  LOW: { label: 'Low Stock', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  HEALTHY: { label: 'In Stock', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
};

export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '—';
  return `LKR ${amount.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatQuantity = (
  value: number | null | undefined,
  unit: InventoryUnit
): string => {
  if (value === null || value === undefined) return '—';
  const rounded = Number.isInteger(value) ? value.toString() : value.toFixed(2);
  return `${rounded} ${UNIT_ABBR[unit]}`;
};

export const formatDateTime = (value?: string | null): string => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
