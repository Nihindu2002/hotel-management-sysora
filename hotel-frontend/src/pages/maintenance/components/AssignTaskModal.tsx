import { useState } from 'react';
import { assignMaintenanceTask } from '../../../services/maintenanceService';
import type { Staff } from '../../../types/staff';

interface AssignTaskModalProps {
  taskId: string;
  roomLabel: string;
  currentAssignee?: string | null;
  staffList: Staff[];
  getUserName: (userUid: string) => string | null;
  onClose: () => void;
  onAssigned: () => void | Promise<void>;
}

/**
 * Only active staff in the MAINTENANCE department are offered here; the backend
 * re-validates both conditions when the assignment is submitted.
 */
export default function AssignTaskModal({
  taskId,
  roomLabel,
  currentAssignee,
  staffList,
  getUserName,
  onClose,
  onAssigned,
}: AssignTaskModalProps) {
  const [selectedStaffUid, setSelectedStaffUid] = useState(currentAssignee || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedStaffUid) return;

    try {
      setSubmitting(true);
      setError(null);
      await assignMaintenanceTask(taskId, selectedStaffUid);
      await onAssigned();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to assign staff.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Assign Maintenance Staff</h3>
        <p className="text-sm text-gray-600">
          Assign this task for <strong>{roomLabel}</strong>.
        </p>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">
            Eligible Maintenance Staff (Active Only)
          </label>
          {staffList.length === 0 ? (
            <div className="p-3 text-xs text-amber-700 bg-amber-50 rounded-lg border border-amber-200">
              No active staff found in the MAINTENANCE department.
            </div>
          ) : (
            <select
              value={selectedStaffUid}
              onChange={(e) => setSelectedStaffUid(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Select a staff member…</option>
              {staffList.map((s) => {
                const userName = getUserName(s.userUid);
                return (
                  <option key={s.userUid} value={s.userUid}>
                    {userName ? `${userName} (${s.employeeId})` : `${s.employeeId} — ${s.position}`}
                  </option>
                );
              })}
            </select>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !selectedStaffUid}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? 'Assigning…' : 'Confirm Assignment'}
          </button>
        </div>
      </div>
    </div>
  );
}
