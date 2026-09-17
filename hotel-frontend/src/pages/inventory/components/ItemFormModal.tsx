import { useState } from 'react';
import { createItem, updateItem } from '../../../services/inventoryService';
import {
  CATEGORIES,
  CATEGORY_LABEL,
  UNITS,
  UNIT_LABEL,
} from '../inventoryMeta';
import type {
  InventoryCategory,
  InventoryItem,
  InventoryUnit,
} from '../../../types/inventory';

interface ItemFormModalProps {
  /** Present when editing; omitted when creating. */
  item?: InventoryItem | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

export default function ItemFormModal({ item, onClose, onSaved }: ItemFormModalProps) {
  const isEdit = Boolean(item);

  const [form, setForm] = useState({
    itemName: item?.itemName ?? '',
    category: (item?.category ?? 'LINEN') as InventoryCategory,
    description: item?.description ?? '',
    unit: (item?.unit ?? 'PIECE') as InventoryUnit,
    minimumStock: item?.minimumStock != null ? String(item.minimumStock) : '0',
    unitCost: item?.unitCost != null ? String(item.unitCost) : '0',
    supplierId: item?.supplierId ?? '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minimumStock = Number.parseFloat(form.minimumStock);
  const unitCost = Number.parseFloat(form.unitCost);
  const minimumStockValid = !Number.isNaN(minimumStock) && minimumStock >= 0;
  const unitCostValid = !Number.isNaN(unitCost) && unitCost >= 0;
  const nameValid = form.itemName.trim().length > 0;
  const canSubmit = nameValid && minimumStockValid && unitCostValid && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nameValid) {
      setError('Item name is required.');
      return;
    }
    if (!minimumStockValid) {
      setError('Minimum stock must be zero or greater.');
      return;
    }
    if (!unitCostValid) {
      setError('Unit cost must be zero or greater.');
      return;
    }

    const payload = {
      itemName: form.itemName.trim(),
      category: form.category,
      description: form.description.trim() || undefined,
      unit: form.unit,
      minimumStock,
      unitCost,
      supplierId: form.supplierId.trim() || undefined,
    };

    try {
      setSubmitting(true);
      setError(null);
      if (isEdit && item) {
        await updateItem(item.itemId, payload);
      } else {
        await createItem(payload);
      }
      await onSaved();
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          `Failed to ${isEdit ? 'update' : 'create'} the item.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-gray-900">
          {isEdit ? 'Edit Inventory Item' : 'New Inventory Item'}
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          {isEdit
            ? 'Quantity is not editable here — it only moves through stock transactions so every change stays auditable.'
            : 'New items start at zero quantity. Use Stock In to receive the first delivery.'}
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.itemName}
              onChange={(e) => setForm({ ...form, itemName: e.target.value })}
              placeholder="e.g. Bath Towel"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value as InventoryCategory })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">
                Unit <span className="text-red-500">*</span>
              </label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value as InventoryUnit })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {UNIT_LABEL[u]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">
                Minimum Stock <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.minimumStock}
                onChange={(e) => setForm({ ...form, minimumStock: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                required
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Alerts when stock falls to this level.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">
                Unit Cost <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.unitCost}
                onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                required
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Used to value stock and price stock-in purchases.
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">
              Supplier
            </label>
            <input
              type="text"
              value={form.supplierId}
              onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
              placeholder="e.g. Lanka Textiles (Pvt) Ltd"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">
              Description
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional notes about this item."
              className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
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
              className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
