export type InventoryCategory =
  | 'LINEN'
  | 'TOILETRIES'
  | 'CLEANING_SUPPLIES'
  | 'MAINTENANCE_SUPPLIES'
  | 'OFFICE_SUPPLIES'
  | 'FOOD'
  | 'BEVERAGE'
  | 'OTHER';

export type InventoryStatus = 'ACTIVE' | 'INACTIVE';

export type InventoryUnit =
  | 'PIECE'
  | 'BOX'
  | 'PACK'
  | 'KG'
  | 'GRAM'
  | 'LITER'
  | 'MILLILITER'
  | 'BOTTLE'
  | 'CAN'
  | 'OTHER';

export type InventoryTransactionType = 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT';

export interface InventoryItem {
  itemId: string;
  itemName: string;
  category: InventoryCategory;
  description?: string | null;
  unit: InventoryUnit;
  /** Read-only in the API: only stock transactions move this value. */
  quantity: number;
  minimumStock: number;
  unitCost: number;
  supplierId?: string | null;
  status: InventoryStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryTransaction {
  transactionId: string;
  itemId: string;
  transactionType: InventoryTransactionType;
  /** Size of the movement. Always positive; the type carries the direction. */
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  unitCost?: number | null;
  reference?: string | null;
  performedBy?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface InventoryDashboard {
  totalItems: number;
  activeItems: number;
  inactiveItems: number;
  /** Active items at or below minimum stock — includes out-of-stock items. */
  lowStockItems: number;
  outOfStockItems: number;
  totalInventoryValue: number;
  recentTransactions: InventoryTransaction[];
}

/**
 * Note there is no `quantity` field: the API deliberately starts new items at
 * zero and only moves stock through transactions, so every change is auditable.
 */
export interface CreateInventoryItemRequest {
  itemName: string;
  category: InventoryCategory;
  description?: string;
  unit: InventoryUnit;
  minimumStock: number;
  unitCost: number;
  supplierId?: string;
}

export type UpdateInventoryItemRequest = CreateInventoryItemRequest;

export interface StockInRequest {
  itemId: string;
  /** Must be greater than 0. */
  quantity: number;
  unitCost?: number;
  reference?: string;
  notes?: string;
}

export interface StockOutRequest {
  itemId: string;
  /** Must be greater than 0 and cannot exceed the available quantity. */
  quantity: number;
  reference?: string;
  notes?: string;
}

export interface AdjustmentRequest {
  itemId: string;
  /** The exact quantity the item should end up at. */
  newQuantity: number;
  reason?: string;
}

export interface InventoryItemFilters {
  search?: string;
  category?: InventoryCategory | 'ALL';
  status?: InventoryStatus | 'ALL';
  lowStockOnly?: boolean;
}
