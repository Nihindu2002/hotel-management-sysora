import { useEffect, useState } from 'react';
import { getItems } from '../../../services/inventoryService';
import { startHousekeepingTask } from '../../../services/housekeepingService';
import type { InventoryItem } from '../../../types/inventory';

type Props = {
  taskId: string;
  onClose: () => void;
  onStarted: () => Promise<void> | void;
};

export default function HousekeepingStartModal({ taskId, onClose, onStarted }: Props) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [rows, setRows] = useState<{ rowId: number; itemId: string; quantity: string }[]>([]);
  const [nextRowId, setNextRowId] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getItems()
      .then((data) => { if (active) setItems(data.filter((item) => item.status === 'ACTIVE')); })
      .catch(() => { if (active) setError('Could not load inventory items. You can still start without supplies.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const handleStart = async () => {
    setSubmitting(true);
    setError('');
    try {
      const selectedItems = rows
        .filter((row) => row.itemId && row.quantity !== '')
        .map((row) => ({ itemId: row.itemId, quantity: Number(row.quantity) }));
      await startHousekeepingTask(taskId, selectedItems);
      await onStarted();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not start task or deduct selected inventory.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="start-task-title" className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 id="start-task-title" className="text-lg font-bold text-gray-900">Start housekeeping task</h2>
            <p className="mt-1 text-sm text-gray-600">Choose the supplies you will use. Selected quantities will be deducted from inventory.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label="Close">✕</button>
        </div>

        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="mt-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">Supplies used</h3>
          <button type="button" onClick={() => {
            setRows((current) => [...current, { rowId: nextRowId, itemId: '', quantity: '' }]);
            setNextRowId((current) => current + 1);
          }} disabled={loading || submitting}
            className="inline-flex items-center gap-1 rounded-md border border-indigo-300 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
            </svg>
            Add item
          </button>
        </div>

        <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
          {loading ? <p className="py-6 text-center text-sm text-gray-500">Loading inventory…</p> : items.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">No active inventory items found. You can still start without supplies.</p>
          ) : rows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-300 py-5 text-center text-sm text-gray-500">No supplies added. Use Add item if you need to record supplies.</p>
          ) : rows.map((row) => {
            const selected = items.find((item) => item.itemId === row.itemId);
            const available = selected?.quantity ?? 0;
            const outOfStock = Boolean(selected) && available <= 0;
            const overStock = Boolean(selected) && Number(row.quantity || 0) > available;
            return (
              <div key={row.rowId} className="grid grid-cols-[minmax(0,1fr)_6rem_auto] items-start gap-2 rounded-lg border border-gray-200 p-3">
                <div className="min-w-0">
                  <select aria-label="Select inventory item" value={row.itemId} disabled={submitting}
                    onChange={(event) => setRows((current) => current.map((entry) => entry.rowId === row.rowId
                      ? { ...entry, itemId: event.target.value, quantity: '' } : entry))}
                    className="w-full rounded-md border border-gray-300 px-2 py-2 text-sm text-gray-900">
                    <option value="">Select an item…</option>
                    {items.map((item) => {
                      const noStock = (item.quantity ?? 0) <= 0;
                      return <option key={item.itemId} value={item.itemId} disabled={noStock}>
                        {item.itemName} — {noStock ? 'Out of stock' : `${item.quantity} ${item.unit.toLowerCase()} available`}
                      </option>;
                    })}
                  </select>
                  {selected && <p className={`mt-1 text-xs ${outOfStock ? 'font-semibold text-red-600' : overStock ? 'font-semibold text-red-600' : 'text-gray-500'}`}>
                    {outOfStock ? 'Out of stock' : overStock ? `Only ${available} ${selected.unit.toLowerCase()} available` : `Available: ${available} ${selected.unit.toLowerCase()}`}
                  </p>}
                </div>
                <input aria-label="Quantity to use" type="number" min="0.01" max={available || undefined} step="0.01"
                  value={row.quantity} disabled={!selected || outOfStock || submitting}
                  onChange={(event) => setRows((current) => current.map((entry) => entry.rowId === row.rowId
                    ? { ...entry, quantity: event.target.value } : entry))}
                  placeholder="Qty" className="w-24 rounded-md border border-gray-300 px-2 py-2 text-sm disabled:bg-gray-100" />
                <button type="button" aria-label="Remove supply row" disabled={submitting}
                  onClick={() => setRows((current) => current.filter((entry) => entry.rowId !== row.rowId))}
                  className="rounded p-2 text-gray-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12m-10 0 1 13h6l1-13M9 7V4h6v3" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700">Cancel</button>
          <button type="button" onClick={() => void handleStart()} disabled={submitting || loading} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            {submitting ? 'Starting…' : 'Start task'}
          </button>
        </div>
      </section>
    </div>
  );
}
