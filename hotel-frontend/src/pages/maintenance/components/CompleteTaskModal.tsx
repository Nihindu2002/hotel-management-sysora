import { useState } from 'react';
import { completeMaintenanceTask } from '../../../services/maintenanceService';

interface CompleteTaskModalProps {
  taskId: string;
  roomLabel: string;
  onClose: () => void;
  onCompleted: () => void | Promise<void>;
}

/**
 * Completion captures the actual cost and completion information, which the
 * backend forwards to Finance as an EXPENSE when the cost is greater than zero.
 */
export default function CompleteTaskModal({
  taskId,
  roomLabel,
  onClose,
  onCompleted,
}: CompleteTaskModalProps) {
  const [actualCost, setActualCost] = useState('0');
  const [completionNotes, setCompletionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedCost = Number.parseFloat(actualCost);
  const costIsValid = !Number.isNaN(parsedCost) && parsedCost >= 0;

  const handleSubmit = async () => {
    if (!costIsValid) {
      setError('Actual cost must be zero or greater.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await completeMaintenanceTask(taskId, {
        actualCost: parsedCost,
        completionNotes: completionNotes.trim() || undefined,
      });
      await onCompleted();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to complete task.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Complete Maintenance Task</h3>
        <p className="text-sm text-gray-600">
          Recording completion for <strong>{roomLabel}</strong>.
        </p>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">
            Actual Cost
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={actualCost}
            onChange={(e) => setActualCost(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Enter <strong>0</strong> if the repair was free — no finance expense is
            recorded in that case.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">
            Completion Information
          </label>
          <textarea
            rows={3}
            value={completionNotes}
            onChange={(e) => setCompletionNotes(e.target.value)}
            placeholder="e.g. Replaced the mixer tap cartridge and tested for leaks."
            className="w-full rounded-lg border border-gray-300 p-3 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !costIsValid}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? 'Completing…' : 'Complete Task'}
          </button>
        </div>
      </div>
    </div>
  );
}
