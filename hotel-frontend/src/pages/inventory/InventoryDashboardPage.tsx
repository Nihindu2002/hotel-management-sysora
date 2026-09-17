import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDashboard, getItems } from '../../services/inventoryService';
import {
  CATEGORY_LABEL,
  TRANSACTION_BADGE,
  formatCurrency,
  formatDateTime,
  formatQuantity,
  stockLevel,
  STOCK_LEVEL_BADGE,
} from './inventoryMeta';
import type { InventoryDashboard, InventoryItem } from '../../types/inventory';

const EMPTY: InventoryDashboard = {
  totalItems: 0,
  activeItems: 0,
  inactiveItems: 0,
  lowStockItems: 0,
  outOfStockItems: 0,
  totalInventoryValue: 0,
  recentTransactions: [],
};

export default function InventoryDashboardPage() {
  const { user } = useAuth();

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  // The transaction feed is only readable by these roles; others see the
  // dashboard metrics but not the audit log.
  const canReadTransactions =
    isAdminOrManager || user?.role === 'STAFF';

  const [stats, setStats] = useState<InventoryDashboard>(EMPTY);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [dashboard, itemList] = await Promise.all([
        getDashboard(),
        getItems().catch(() => [] as InventoryItem[]),
      ]);
      setStats(dashboard);
      setItems(itemList);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || 'Failed to load the inventory dashboard.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const itemMap = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    items.forEach((i) => map.set(i.itemId, i));
    return map;
  }, [items]);

  const needsAttention = useMemo(
    () =>
      items
        .filter((i) => i.status === 'ACTIVE')
        .filter((i) => stockLevel(i.quantity, i.minimumStock) !== 'HEALTHY')
        .sort((a, b) => a.quantity / (a.minimumStock || 1) - b.quantity / (b.minimumStock || 1))
        .slice(0, 5),
    [items]
  );

  const cards = [
    {
      label: 'Total Items',
      value: stats.totalItems.toString(),
      hint: `${stats.activeItems} active · ${stats.inactiveItems} inactive`,
      tone: 'text-gray-600',
      chip: 'bg-gray-100 text-gray-600',
      icon: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z',
    },
    {
      label: 'Low Stock',
      value: stats.lowStockItems.toString(),
      hint: 'At or below minimum (incl. out of stock)',
      tone: 'text-amber-600',
      chip: 'bg-amber-50 text-amber-600',
      icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
    },
    {
      label: 'Out of Stock',
      value: stats.outOfStockItems.toString(),
      hint: 'Nothing on hand',
      tone: 'text-red-600',
      chip: 'bg-red-50 text-red-600',
      icon: 'M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
      label: 'Inventory Value',
      value: formatCurrency(stats.totalInventoryValue),
      hint: 'Active stock at unit cost',
      tone: 'text-emerald-600',
      chip: 'bg-emerald-50 text-emerald-600',
      icon: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Stock levels, reorder alerts, and recent movements across the property.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdminOrManager && (
            <Link
              to="/inventory/items?lowStock=true"
              className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 shadow-sm hover:bg-amber-100 transition-colors"
            >
              Reorder List
            </Link>
          )}
          <Link
            to="/inventory/items"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            All Items
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold uppercase tracking-wider ${card.tone}`}>
                {card.label}
              </span>
              <span className={`rounded-full p-2 ${card.chip}`}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={card.icon} />
                </svg>
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="mt-1 text-xs text-gray-500">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Needs attention */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Needs Reordering</h2>
              <p className="text-xs text-gray-500">Active items at or below minimum stock</p>
            </div>
            <Link
              to="/inventory/items?lowStock=true"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500">Loading…</div>
          ) : needsAttention.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              Every active item is above its minimum stock.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {needsAttention.map((item) => {
                const level = stockLevel(item.quantity, item.minimumStock);
                const badge = STOCK_LEVEL_BADGE[level];
                return (
                  <li key={item.itemId} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <Link
                        to={`/inventory/items/${item.itemId}`}
                        className="truncate text-sm font-semibold text-gray-900 hover:text-indigo-700"
                      >
                        {item.itemName}
                      </Link>
                      <p className="text-xs text-gray-500">
                        {CATEGORY_LABEL[item.category]} · min{' '}
                        {formatQuantity(item.minimumStock, item.unit)}
                      </p>
                    </div>
                    <div className="ml-3 flex shrink-0 items-center gap-3">
                      <span className="text-sm font-bold text-gray-900">
                        {formatQuantity(item.quantity, item.unit)}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Recent transactions */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Recent Transactions</h2>
              <p className="text-xs text-gray-500">Latest stock movements</p>
            </div>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500">Loading…</div>
          ) : stats.recentTransactions.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              No stock movements recorded yet.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {stats.recentTransactions.slice(0, 6).map((tx) => {
                const badge = TRANSACTION_BADGE[tx.transactionType];
                const item = itemMap.get(tx.itemId);
                return (
                  <li key={tx.transactionId} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <Link
                        to={`/inventory/items/${tx.itemId}`}
                        className="truncate text-sm font-semibold text-gray-900 hover:text-indigo-700"
                      >
                        {item?.itemName ?? `Item ${tx.itemId.slice(0, 8)}…`}
                      </Link>
                      <p className="text-xs text-gray-500">
                        {formatDateTime(tx.createdAt)}
                      </p>
                    </div>
                    <div className="ml-3 flex shrink-0 items-center gap-3">
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
                        {badge.label}
                      </span>
                      <span className="text-xs font-medium text-gray-700">
                        {tx.previousQuantity} → {tx.newQuantity}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
