import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getItems } from '../../services/inventoryService';
import ItemFormModal from './components/ItemFormModal';
import {
  CATEGORIES,
  CATEGORY_LABEL,
  STATUSES,
  STATUS_BADGE,
  STOCK_LEVEL_BADGE,
  formatCurrency,
  formatQuantity,
  stockLevel,
} from './inventoryMeta';
import type {
  InventoryCategory,
  InventoryItem,
  InventoryStatus,
} from '../../types/inventory';

export default function InventoryItems() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<InventoryCategory | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<InventoryStatus | 'ALL'>('ALL');
  const [lowStockOnly, setLowStockOnly] = useState(searchParams.get('lowStock') === 'true');

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const loadItems = useCallback(async () => {
    try {
      setError(null);
      setItems(await getItems());
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load inventory items.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Mirrors the low-stock toggle into the URL so the dashboard can deep-link
  // into a filtered view, and so a refresh keeps the filter applied.
  const toggleLowStock = (next: boolean) => {
    setLowStockOnly(next);
    const params = new URLSearchParams(searchParams);
    if (next) {
      params.set('lowStock', 'true');
    } else {
      params.delete('lowStock');
    }
    setSearchParams(params, { replace: true });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((item) => {
      if (q && !item.itemName.toLowerCase().includes(q)) return false;
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (lowStockOnly) {
        if (item.status !== 'ACTIVE') return false;
        // Matches the backend's /low-stock rule: at or below minimum stock.
        if (item.quantity > item.minimumStock) return false;
      }
      return true;
    });
  }, [items, search, categoryFilter, statusFilter, lowStockOnly]);

  const lowStockCount = useMemo(
    () =>
      items.filter((i) => i.status === 'ACTIVE' && i.quantity <= i.minimumStock).length,
    [items]
  );

  const outOfStockCount = useMemo(
    () => items.filter((i) => i.status === 'ACTIVE' && i.quantity <= 0).length,
    [items]
  );

  const openCreate = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/inventory" className="text-sm font-medium text-gray-500 hover:text-gray-700">
              Inventory
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-sm font-medium text-gray-900">Items</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Inventory Items</h1>
          <p className="mt-0.5 text-sm text-gray-600">
            Search, filter, and manage stock items across the property.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Item
          </button>
        )}
      </div>

      {successMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMsg}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Search
            </label>
            <div className="relative">
              <svg
                className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by item name…"
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as InventoryCategory | 'ALL')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as InventoryStatus | 'ALL')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_BADGE[s].label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => toggleLowStock(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Low stock only
            {lowStockCount > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                {lowStockCount}
              </span>
            )}
          </label>

          <button
            type="button"
            onClick={() => {
              setSearch('');
              setCategoryFilter('ALL');
              setStatusFilter('ALL');
              toggleLowStock(false);
            }}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
        <span>
          <strong className="text-gray-900">{filtered.length}</strong> of {items.length} items
        </span>
        <span>
          Low stock: <strong className="text-amber-700">{lowStockCount}</strong>
        </span>
        <span>
          Out of stock: <strong className="text-red-700">{outOfStockCount}</strong>
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <span className="ml-3 text-sm text-gray-500">Loading items…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            No inventory items match your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Item</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Min Stock</th>
                  <th className="px-4 py-3 text-right">Unit Cost</th>
                  <th className="px-4 py-3 text-right">Stock Value</th>
                  <th className="px-4 py-3 text-left">Stock Level</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((item) => {
                  const level = stockLevel(item.quantity, item.minimumStock);
                  const levelBadge = STOCK_LEVEL_BADGE[level];
                  const statusBadge = STATUS_BADGE[item.status];

                  return (
                    <tr key={item.itemId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          to={`/inventory/items/${item.itemId}`}
                          className="font-semibold text-gray-900 hover:text-indigo-700"
                        >
                          {item.itemName}
                        </Link>
                        {item.supplierId && (
                          <span className="block text-xs text-gray-400">{item.supplierId}</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {CATEGORY_LABEL[item.category]}
                      </td>

                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatQuantity(item.quantity, item.unit)}
                      </td>

                      <td className="px-4 py-3 text-right text-gray-600">
                        {formatQuantity(item.minimumStock, item.unit)}
                      </td>

                      <td className="px-4 py-3 text-right text-gray-700">
                        {formatCurrency(item.unitCost)}
                      </td>

                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatCurrency((item.quantity ?? 0) * (item.unitCost ?? 0))}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${levelBadge.cls}`}>
                          {levelBadge.label}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadge.cls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dot}`} />
                          {statusBadge.label}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/inventory/items/${item.itemId}`}
                            className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                          >
                            View
                          </Link>
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => openEdit(item)}
                              className="rounded border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <ItemFormModal
          item={editingItem}
          onClose={() => {
            setFormOpen(false);
            setEditingItem(null);
          }}
          onSaved={async () => {
            setSuccessMsg(
              editingItem ? 'Item updated successfully.' : 'Item created successfully.'
            );
            await loadItems();
          }}
        />
      )}
    </div>
  );
}
