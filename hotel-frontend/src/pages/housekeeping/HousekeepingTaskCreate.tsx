import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createHousekeepingTask } from '../../services/housekeepingService';
import { getRooms } from '../../services/roomService';
import type { Room } from '../../types/room';
import type {
  HousekeepingTaskType,
  HousekeepingTaskPriority,
} from '../../types/housekeeping';

const TASK_TYPES: { value: HousekeepingTaskType; label: string; desc: string }[] = [
  {
    value: 'CHECKOUT_CLEANING',
    label: 'Checkout Cleaning',
    desc: 'Standard turnaround cleaning after guest checkout. Transitions room to AVAILABLE when completed.',
  },
  {
    value: 'REGULAR_CLEANING',
    label: 'Regular Daily Cleaning',
    desc: 'Daily tidying, linen change, and restocking during an active guest stay.',
  },
  {
    value: 'DEEP_CLEANING',
    label: 'Deep Cleaning',
    desc: 'Intensive scheduled scrubbing, carpet shampooing, and detail sanitization.',
  },
  {
    value: 'INSPECTION',
    label: 'Room Inspection',
    desc: 'Supervisor readiness inspection before new guest check-in.',
  },
];

const PRIORITIES: { value: HousekeepingTaskPriority; label: string; color: string }[] = [
  { value: 'LOW', label: 'Low', color: 'border-slate-300 text-slate-700' },
  { value: 'MEDIUM', label: 'Medium', color: 'border-blue-300 text-blue-700' },
  { value: 'HIGH', label: 'High', color: 'border-amber-300 text-amber-700' },
  { value: 'URGENT', label: 'Urgent', color: 'border-red-400 text-red-700' },
];

export default function HousekeepingTaskCreate() {
  const navigate = useNavigate();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  const [form, setForm] = useState({
    roomId: '',
    taskType: 'CHECKOUT_CLEANING' as HousekeepingTaskType,
    priority: 'MEDIUM' as HousekeepingTaskPriority,
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    try {
      setSubmitting(true);
      setError(null);

      const created = await createHousekeepingTask({
        roomId: form.roomId,
        taskType: form.taskType,
        priority: form.priority,
        notes: form.notes.trim() || undefined,
      });

      navigate(`/housekeeping/tasks/${created.taskId}`);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to create housekeeping task.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedRoom = rooms.find((r) => r.roomId === form.roomId);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/housekeeping" className="hover:text-gray-700">
          Housekeeping
        </Link>
        <span>/</span>
        <Link to="/housekeeping/tasks" className="hover:text-gray-700">
          Tasks
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">New</span>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Create Housekeeping Task</h1>
        <p className="mt-1 text-sm text-gray-600">
          Schedule cleaning or room inspection for hotel rooms.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Room Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Select Room <span className="text-red-500">*</span>
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
                    Room {room.roomNumber} — Floor {room.floor} ({room.roomType}) [Status: {room.status}]
                  </option>
                ))}
              </select>
            )}

            {selectedRoom && (
              <div className="mt-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-600 border border-gray-200 flex items-center justify-between">
                <span>
                  <strong>Room {selectedRoom.roomNumber}</strong> · Floor {selectedRoom.floor} · {selectedRoom.roomType}
                </span>
                <span className="rounded bg-white px-2 py-0.5 font-semibold text-gray-800 border">
                  Status: {selectedRoom.status}
                </span>
              </div>
            )}
          </div>

          {/* Task Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Task Type <span className="text-red-500">*</span>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              {TASK_TYPES.map((type) => (
                <label
                  key={type.value}
                  className={`flex flex-col p-3 rounded-xl border cursor-pointer transition ${
                    form.taskType === type.value
                      ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="taskType"
                      value={type.value}
                      checked={form.taskType === type.value}
                      onChange={() => setForm({ ...form, taskType: type.value })}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-semibold text-gray-900">{type.label}</span>
                  </div>
                  <span className="mt-1 text-xs text-gray-500 pl-5">{type.desc}</span>
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
                  key={p.value}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition text-xs font-semibold ${
                    form.priority === p.value
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                      : `bg-white hover:bg-gray-50 ${p.color}`
                  }`}
                >
                  <input
                    type="radio"
                    name="priority"
                    value={p.value}
                    checked={form.priority === p.value}
                    onChange={() => setForm({ ...form, priority: p.value })}
                    className="hidden"
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Instructions & Notes
            </label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="e.g. Extra towels requested, check mini-bar, stain on bedsheet…"
              className="w-full rounded-lg border border-gray-300 p-3 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={() => navigate('/housekeeping/tasks')}
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

