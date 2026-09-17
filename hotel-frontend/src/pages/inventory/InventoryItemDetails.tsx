import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getItemById,
  getTransactionsByItemId,
  deactivateItem,
} from '../../services/inventoryService';
import ItemFormModal from './components/ItemFormModal';
import StockActionModal from './components/StockActionModal';
import {
  CATEGORY_LABEL,
  STATUS_BADGE,
  STOCK_LEVEL_BADGE,
  TRANSACTION_BADGE,
  UNIT_ABBR,
  formatCurrency,
  formatDateTime,
  formatQuantity,
  stockLevel,
} from './inventoryMeta';
import type {
  InventoryItem,
  InventoryTransaction,
  InventoryTransactionType,
} from '../../types/inventory';

export default function InventoryItemDetails() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  // Stock movements are permitted for STAFF as well as ADMIN/MANAGER.
  const canMoveStock = isAdminOrManager || user?.role === 'STAFF';
  // The transaction audit log is only readable by these roles.
  const canReadTransactions = canMoveStock;

  const [item, setItem] = useState<InventoryItem | null>(null);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [transactionsDenied, setTransactionsDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [stockAction, setStockAction] = useState<InventoryTransactionType | null>(null);

  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  const loadItem = useCallback(async () => {
    if (!itemId) return;
    try {
      setError(null);
      setItem(await getItemById(itemId));

      try {
        setTransactions(await getTransactionsByItemId(itemId));
        setTransactionsDenied(false);
      } catch {
        // Roles without audit-log access still see the item itself.
        setTransactions([]);
        setTransactionsDenied(true);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load the inventory item.');
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  const handleDeactivate = async () => {
    if (!item) return;
    try {
      setDeactivating(true);
      setDeactivateError(null);
      await deactivateItem(item.itemId);
      setDeactivateOpen(false);
      setSuccessMsg('Item deactivated. It no longer accepts stock movements.');
      await loadItem();
    } catch (err: any) {
      setDeactivateError(err?.response?.data?.message || 'Failed to deactivate the item.');
    } finally {
      setDeactivating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        <span className="ml-3 text-sm text-gray-500">Loading item…</span>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error || 'Inventory item not found.'}
        <button
          type="button"
          onClick={() => navigate('/inventory/items')}
          className="ml-3 font-semibold underline"
        >
          Back to items
        </button>
      </div>
    );
  }

  const level = stockLevel(item.quantity, item.minimumStock);
  const levelBadge = STOCK_LEVEL_BADGE[level];
  const statusBadge = STATUS_BADGE[item.status];
  const isActive = item.status === 'ACTIVE';
  const stockValue = (item.quantity ?? 0) * (item.unitCost ?? 0);
  const shortfall = Math.max(0, (item.minimumStock ?? 0) - (item.quantity ?? 0));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link to="/inventory" className="hover:text-gray-700">
              Inventory
            </Link>
            <span>/</span>
            <Link to="/inventory/items" className="hover:text-gray-700">
              Items
            </Link>
            <span>/</span>
            <span className="text-gray-900">{item.itemName}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{item.itemName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${levelBadge.cls}`}>
              {levelBadge.label}
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadge.cls}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dot}`} />
              {statusBadge.label}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canMoveStock && isActive && (
            <>
              <button
                type="button"
                onClick={() => setStockAction('STOCK_IN')}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
              >
                Stock In
              </button>
              <button
                type="button"
                onClick={() => setStockAction('STOCK_OUT')}
                disabled={(item.quantity ?? 0) <= 0}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition"
              >
                Stock Out
              </button>
              <button
                type="button"
                onClick={() => setStockAction('ADJUSTMENT')}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
              >
                Adjust
              </button>
            </>
          )}
          {isAdminOrManager && (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Edit
            </button>
          )}
          {isAdminOrManager && isActive && (
            <button
              type="button"
              onClick={() => setDeactivateOpen(true)}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 transition"
            >
              Deactivate
            </button>
          )}
        </div>
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

      {/* Low stock callout */}
      {isActive && shortfall > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Reorder needed.</strong> Stock is {formatQuantity(item.quantity, item.unit)}{' '}
          against a minimum of {formatQuantity(item.minimumStock, item.unit)} — short by{' '}
          {formatQuantity(shortfall, item.unit)}.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Item information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Item Information</h2>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Category
                </dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {CATEGORY_LABEL[item.category]}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Unit
                </dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {UNIT_ABBR[item.unit]}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Supplier
                </dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {item.supplierId || <span className="italic text-gray-400">Not recorded</span>}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Last Updated
                </dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {formatDateTime(item.updatedAt)}
                </dd>
              </div>
            </dl>

            {item.description && (
              <div className="mt-5 pt-5 border-t border-gray-100">
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Description
                </dt>
                <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">
                  {item.description}
                </p>
              </div>
            )}
          </div>

          {/* Transaction history */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 p-6 pb-4">
              <h2 className="text-lg font-bold text-gray-900">Transaction History</h2>
              <p className="text-xs text-gray-500">
                Every stock movement for this item, newest first
              </p>
            </div>

            {!canReadTransactions || transactionsDenied ? (
              <div className="p-6 text-sm text-gray-500">
                Your role can view items but not the stock movement audit log.
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                No stock movements recorded for this item yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-right">Change</th>
                      <th className="px-4 py-3 text-center">Quantity</th>
                      <th className="px-4 py-3 text-left">Reference</th>
                      <th className="px-4 py-3 text-left">Performed By</th>
                      <th className="px-4 py-3 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.map((tx) => {
                      const badge = TRANSACTION_BADGE[tx.transactionType];
                      return (
                        <tr key={tx.transactionId} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-gray-800">
                            {tx.previousQuantity} → {tx.newQuantity}
                          </td>
                          <td className="px-4 py-3 text-center text-xs font-semibold text-gray-700">
                            {badge.sign}
                            {tx.quantity}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {tx.reference || '—'}
                            {tx.notes && (
                              <span className="block italic text-gray-400">{tx.notes}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">
                            {tx.performedBy ? `${tx.performedBy.slice(0, 10)}…` : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {formatDateTime(tx.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Stock sidebar */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900">Current Stock</h2>
            <p className="mt-3 text-3xl font-bold text-gray-900">
              {formatQuantity(item.quantity, item.unit)}
            </p>
            <span className={`mt-2 inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${levelBadge.cls}`}>
              {levelBadge.label}
            </span>

            <dl className="mt-5 space-y-3 border-t border-gray-100 pt-4 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">Minimum Stock</dt>
                <dd className="font-medium text-gray-900">
                  {formatQuantity(item.minimumStock, item.unit)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">Unit Cost</dt>
                <dd className="font-medium text-gray-900">{formatCurrency(item.unitCost)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">Stock Value</dt>
                <dd className="font-bold text-gray-900">{formatCurrency(stockValue)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900">Finance</h2>
            <p className="mt-3 text-xs text-gray-500">
              Receiving stock records a finance <strong>EXPENSE</strong> in the{' '}
              <strong>INVENTORY</strong> category, valued at quantity × unit cost.
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Stock out and adjustments are operational movements only — they never
              create a finance record.
            </p>
          </div>
        </div>
      </div>

      {editOpen && (
        <ItemFormModal
          item={item}
          onClose={() => setEditOpen(false)}
          onSaved={async () => {
            setSuccessMsg('Item updated successfully.');
            await loadItem();
          }}
        />
      )}

      {stockAction && (
        <StockActionModal
          item={item}
          action={stockAction}
          onClose={() => setStockAction(null)}
          onCompleted={async (type) => {
            setSuccessMsg(
              type === 'STOCK_IN'
                ? 'Stock received. Quantity updated and any purchase expense recorded.'
                : type === 'STOCK_OUT'
                  ? 'Stock issued. Quantity updated.'
                  : 'Stock adjusted to the counted quantity.'
            );
            await loadItem();
          }}
        />
      )}

      {deactivateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-gray-900">Deactivate Item?</h3>
            <p className="text-sm text-gray-600">
              <strong>{item.itemName}</strong> will be marked inactive and will no longer
              accept stock movements. Its history is kept.
            </p>

            {deactivateError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {deactivateError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeactivateOpen(false)}
                disabled={deactivating}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={deactivating}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deactivating ? 'Deactivating…' : 'Yes, Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
