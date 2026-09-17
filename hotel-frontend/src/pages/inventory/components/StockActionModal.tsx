import { useState } from 'react';
import { stockIn, stockOut, adjustStock } from '../../../services/inventoryService';
import { UNIT_ABBR, formatCurrency, formatQuantity } from '../inventoryMeta';
import type { InventoryItem, InventoryTransactionType } from '../../../types/inventory';

interface StockActionModalProps {
  item: InventoryItem;
  action: InventoryTransactionType;
  onClose: () => void;
  onCompleted: (transactionType: InventoryTransactionType) => void | Promise<void>;
}

const TITLES: Record<InventoryTransactionType, string> = {
  STOCK_IN: 'Receive Stock',
  STOCK_OUT: 'Issue Stock',
  ADJUSTMENT: 'Adjust Stock',
};

export default function StockActionModal({
  item,
  action,
  onClose,
  onCompleted,
}: StockActionModalProps) {
  const isStockIn = action === 'STOCK_IN';
  const isStockOut = action === 'STOCK_OUT';
  const isAdjustment = action === 'ADJUSTMENT';

  const available = item.quantity ?? 0;
  const unit = UNIT_ABBR[item.unit];

  const [quantity, setQuantity] = useState('');
  const [newQuantity, setNewQuantity] = useState(String(available));
  const [unitCost, setUnitCost] = useState(String(item.unitCost ?? 0));
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');

  // Guards against a double-click submitting twice: a repeated stock-in would
  // otherwise be recorded as two separate receipts (and two finance expenses).
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedQuantity = Number.parseFloat(quantity);
  const parsedNewQuantity = Number.parseFloat(newQuantity);
  const parsedUnitCost = Number.parseFloat(unitCost);

  const quantityValid = !Number.isNaN(parsedQuantity) && parsedQuantity > 0;
  const exceedsAvailable = isStockOut && quantityValid && parsedQuantity > available;
  const newQuantityValid = !Number.isNaN(parsedNewQuantity) && parsedNewQuantity >= 0;

  const resultingQuantity = isStockOut
    ? available - (quantityValid ? parsedQuantity : 0)
    : isStockIn
      ? available + (quantityValid ? parsedQuantity : 0)
      : newQuantityValid
        ? parsedNewQuantity
        : available;

  const expensePreview =
    isStockIn && quantityValid && !Number.isNaN(parsedUnitCost)
      ? parsedQuantity * parsedUnitCost
      : 0;

  const canSubmit = isAdjustment
    ? newQuantityValid && !submitting
    : quantityValid && !exceedsAvailable && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isAdjustment) {
      if (!newQuantityValid) {
        setError('Quantity must be zero or greater.');
        return;
      }
    } else if (!quantityValid) {
      setError('Quantity must be greater than zero.');
      return;
    }

    if (exceedsAvailable) {
      setError(
        `Cannot issue more than available stock (${formatQuantity(available, item.unit)}).`
      );
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      if (isStockIn) {
        await stockIn({
          itemId: item.itemId,
          quantity: parsedQuantity,
          unitCost: Number.isNaN(parsedUnitCost) ? undefined : parsedUnitCost,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      } else if (isStockOut) {
        await stockOut({
          itemId: item.itemId,
          quantity: parsedQuantity,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      } else {
        await adjustStock({
          itemId: item.itemId,
          newQuantity: parsedNewQuantity,
          reason: reason.trim() || undefined,
        });
      }

      await onCompleted(action);
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.response?.data?.error || 'Failed to record the movement.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{TITLES[action]}</h3>
          <p className="mt-0.5 text-sm text-gray-600">
            {item.itemName} · currently{' '}
            <strong>{formatQuantity(available, item.unit)}</strong>
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isAdjustment ? (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">
                New Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                autoFocus
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Enter the counted quantity. The difference from{' '}
                {formatQuantity(available, item.unit)} is recorded as the adjustment.
              </p>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">
                Quantity ({unit}) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                autoFocus
              />
              {exceedsAvailable && (
                <p className="mt-1 text-[11px] font-medium text-red-600">
                  Only {formatQuantity(available, item.unit)} available.
                </p>
              )}
            </div>
          )}

          {isStockIn && (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">
                Unit Cost
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Defaults to the item's unit cost ({formatCurrency(item.unitCost)}).
              </p>
            </div>
          )}

          {(isStockIn || isStockOut) && (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">
                Reference
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={isStockIn ? 'e.g. PO-1042' : 'e.g. HK-REQ-88'}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">
              {isAdjustment ? 'Reason' : 'Notes'}
            </label>
            <textarea
              rows={2}
              value={isAdjustment ? reason : notes}
              onChange={(e) =>
                isAdjustment ? setReason(e.target.value) : setNotes(e.target.value)
              }
              placeholder={
                isAdjustment
                  ? 'e.g. Monthly stock count — 3 units damaged'
                  : 'Optional'
              }
              className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Outcome preview */}
          <div
            className={`rounded-lg border p-3 text-xs ${
              isStockIn
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : isStockOut
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-blue-200 bg-blue-50 text-blue-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold uppercase tracking-wider">Result</span>
              <span className="font-bold">
                {available} → {resultingQuantity}
              </span>
            </div>

            {isStockIn && expensePreview > 0 && (
              <p className="mt-1.5">
                Records a finance EXPENSE of{' '}
                <strong>{formatCurrency(expensePreview)}</strong> (category INVENTORY).
              </p>
            )}
            {isStockIn && expensePreview === 0 && (
              <p className="mt-1.5">No finance expense — cost is zero.</p>
            )}
            {isStockOut && (
              <p className="mt-1.5">Consumption only. No finance expense is created.</p>
            )}
            {isAdjustment && (
              <p className="mt-1.5">Reconciliation only. No finance expense is created.</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`rounded-lg px-5 py-2 text-xs font-semibold text-white disabled:opacity-60 ${
                isStockIn
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : isStockOut
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {submitting ? 'Recording…' : TITLES[action]}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
