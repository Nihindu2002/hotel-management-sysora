import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createMaintenanceTask } from '../../services/maintenanceService';
import { getRooms } from '../../services/roomService';
import { ISSUE_TYPE_LABEL, ISSUE_TYPES, PRIORITIES } from './maintenanceMeta';
import type { MaintenanceIssueType, MaintenancePriority } from '../../types/maintenance';
import type { Room } from '../../types/room';

const ISSUE_TYPE_DESC: Record<MaintenanceIssueType, string> = {
  ELECTRICAL: 'Power, lighting, sockets, or wiring faults.',
  PLUMBING: 'Leaks, blocked drains, taps, or water pressure issues.',
  AIR_CONDITIONING: 'Cooling failure, thermostat, or ventilation problems.',
  FURNITURE: 'Damaged beds, wardrobes, desks, or seating.',
  APPLIANCE: 'TV, kettle, minibar, or other in-room appliance faults.',
  NETWORK: 'Wi-Fi, ethernet, or connectivity problems.',
  STRUCTURAL: 'Walls, ceilings, doors, windows, or flooring damage.',
  OTHER: 'Anything that does not fit the categories above.',
};

const PRIORITY_STYLE: Record<MaintenancePriority, string> = {
  LOW: 'border-slate-300 text-slate-700',
  MEDIUM: 'border-blue-300 text-blue-700',
  HIGH: 'border-amber-300 text-amber-700',
  URGENT: 'border-red-400 text-red-700',
};

export default function MaintenanceTaskCreate() {
  const navigate = useNavigate();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    roomId: '',
    issueType: 'ELECTRICAL' as MaintenanceIssueType,
    priority: 'MEDIUM' as MaintenancePriority,
    description: '',
  });

  useEffect(() => {
    getRooms()
      .then((data) => setRooms(data))
      .catch(() => setError('Failed to load hotel rooms. Please refresh.'))
      .finally(() => setLoadingRooms(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.roomId) {
      setError('Please select a room.');
      return;
    }
    if (!form.description.trim()) {
      setError('Please describe the issue.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const created = await createMaintenanceTask({
        roomId: form.roomId,
        issueType: form.issueType,
        priority: form.priority,
        description: form.description.trim(),
      });

      navigate(`/maintenance/tasks/${created.taskId}`);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Failed to create maintenance task.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const selectedRoom = rooms.find((r) => r.roomId === form.roomId);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/maintenance" className="hover:text-gray-700">
          Maintenance
        </Link>
        <span>/</span>
        <Link to="/maintenance/tasks" className="hover:text-gray-700">
          Tasks
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">New</span>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Report Maintenance Issue</h1>
        <p className="mt-1 text-sm text-gray-600">
          Log a fault against a room. The room is marked as under maintenance until the
          issue is resolved or the task is cancelled.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Room */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Room <span className="text-red-500">*</span>
            </label>
            {loadingRooms ? (
              <div className="text-sm text-gray-400">Loading rooms…</div>
            ) : (
              <select
                value={form.roomId}
                onChange={(e) => setForm({ ...form, roomId: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                required
              >
                <option value="">Choose a room…</option>
                {rooms.map((room) => (
                  <option key={room.roomId} value={room.roomId}>
                    Room {room.roomNumber} — Floor {room.floor} ({room.roomType}) [Status:{' '}
                    {room.status}]
                  </option>
                ))}
              </select>
            )}

            {selectedRoom && (
              <div className="mt-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-600 border border-gray-200 flex items-center justify-between">
                <span>
                  <strong>Room {selectedRoom.roomNumber}</strong> · Floor {selectedRoom.floor} ·{' '}
                  {selectedRoom.roomType}
                </span>
                <span className="rounded bg-white px-2 py-0.5 font-semibold text-gray-800 border">
                  Status: {selectedRoom.status}
                </span>
              </div>
            )}
          </div>

          {/* Issue type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Issue Type <span className="text-red-500">*</span>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              {ISSUE_TYPES.map((type) => (
                <label
                  key={type}
                  className={`flex flex-col p-3 rounded-xl border cursor-pointer transition ${
                    form.issueType === type
                      ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="issueType"
                      value={type}
                      checked={form.issueType === type}
                      onChange={() => setForm({ ...form, issueType: type })}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-semibold text-gray-900">
                      {ISSUE_TYPE_LABEL[type]}
                    </span>
                  </div>
                  <span className="mt-1 text-xs text-gray-500 pl-5">
                    {ISSUE_TYPE_DESC[type]}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Priority <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-3">
              {PRIORITIES.map((p) => (
                <label
                  key={p}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition text-xs font-semibold ${
                    form.priority === p
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                      : `bg-white hover:bg-gray-50 ${PRIORITY_STYLE[p]}`
                  }`}
                >
                  <input
                    type="radio"
                    name="priority"
                    value={p}
                    checked={form.priority === p}
                    onChange={() => setForm({ ...form, priority: p })}
                    className="hidden"
                  />
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Bathroom tap drips continuously and the sink drains slowly."
              className="w-full rounded-lg border border-gray-300 p-3 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={() => navigate('/maintenance/tasks')}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 transition"
            >
              {submitting ? 'Creating Task…' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
