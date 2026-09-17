import api from './api';
import type {
  InventoryItem,
  InventoryTransaction,
  InventoryDashboard,
  CreateInventoryItemRequest,
  UpdateInventoryItemRequest,
  StockInRequest,
  StockOutRequest,
  AdjustmentRequest,
} from '../types/inventory';

export const getItems = async (): Promise<InventoryItem[]> => {
  const response = await api.get<InventoryItem[]>('/inventory/items');
  return response.data;
};

export const getItemById = async (itemId: string): Promise<InventoryItem> => {
  const response = await api.get<InventoryItem>(`/inventory/items/${itemId}`);
  return response.data;
};

export const getLowStockItems = async (): Promise<InventoryItem[]> => {
  const response = await api.get<InventoryItem[]>('/inventory/low-stock');
  return response.data;
};

export const getDashboard = async (): Promise<InventoryDashboard> => {
  const response = await api.get<InventoryDashboard>('/inventory/dashboard');
  return response.data;
};

export const createItem = async (
  request: CreateInventoryItemRequest
): Promise<InventoryItem> => {
  const response = await api.post<InventoryItem>('/inventory/items', request);
  return response.data;
};

export const updateItem = async (
  itemId: string,
  request: UpdateInventoryItemRequest
): Promise<InventoryItem> => {
  const response = await api.put<InventoryItem>(`/inventory/items/${itemId}`, request);
  return response.data;
};

export const deactivateItem = async (itemId: string): Promise<InventoryItem> => {
  const response = await api.patch<InventoryItem>(
    `/inventory/items/${itemId}/deactivate`
  );
  return response.data;
};

/**
 * Receiving stock is the only movement that produces a finance EXPENSE; the
 * backend derives `quantity × unitCost` and records it. Never post to
 * /finance from the client for inventory.
 */
export const stockIn = async (
  request: StockInRequest
): Promise<InventoryTransaction> => {
  const response = await api.post<InventoryTransaction>('/inventory/stock-in', request);
  return response.data;
};

export const stockOut = async (
  request: StockOutRequest
): Promise<InventoryTransaction> => {
  const response = await api.post<InventoryTransaction>('/inventory/stock-out', request);
  return response.data;
};

export const adjustStock = async (
  request: AdjustmentRequest
): Promise<InventoryTransaction> => {
  const response = await api.post<InventoryTransaction>('/inventory/adjustment', request);
  return response.data;
};

export const getTransactions = async (): Promise<InventoryTransaction[]> => {
  const response = await api.get<InventoryTransaction[]>('/inventory/transactions');
  return response.data;
};

export const getTransactionsByItemId = async (
  itemId: string
): Promise<InventoryTransaction[]> => {
  const response = await api.get<InventoryTransaction[]>(
    `/inventory/items/${itemId}/transactions`
  );
  return response.data;
};
