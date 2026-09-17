import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getTaskById,
  startMaintenanceTask,
  cancelMaintenanceTask,
  updateMaintenanceCost,
  getEligibleMaintenanceStaff,
} from '../../services/maintenanceService';
import { getRoomById } from '../../services/roomService';
import { getUserByUid, getAllUsers } from '../../services/userService';
import AssignTaskModal from './components/AssignTaskModal';
import CompleteTaskModal from './components/CompleteTaskModal';
import {
  STATUS_BADGE,
  PRIORITY_BADGE,
  ISSUE_TYPE_LABEL,
  formatCurrency,
  formatDateTime,
} from './maintenanceMeta';
import type { MaintenanceTask } from '../../types/maintenance';
import type { Room } from '../../types/room';
import type { Staff } from '../../types/staff';
import type { UserProfile } from '../../types/user';

export default function MaintenanceTaskDetails() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const isMaintenance = user?.role === 'MAINTENANCE';

  const [task, setTask] = useState<MaintenanceTask | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [reporter, setReporter] = useState<UserProfile | null>(null);
  const [assignee, setAssignee] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [assignOpen, setAssignOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [costDraft, setCostDraft] = useState('');
  const [costSaving, setCostSaving] = useState(false);
  const [costError, setCostError] = useState<string | null>(null);

  const loadTask = useCallback(async () => {
    if (!taskId) return;
    try {
      setError(null);
      const data = await getTaskById(taskId);
      setTask(data);
      setCostDraft(data.actualCost != null ? String(data.actualCost) : '');
      setRoom(await getRoomById(data.roomId).catch(() => null));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load maintenance task.');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  useEffect(() => {
    if (isAdminOrManager) {
      getEligibleMaintenanceStaff()
        .then(setStaffList)
        .catch(() => setStaffList([]));
      // Only ADMIN can read the full user directory; MANAGER falls back to uid.
      getAllUsers()
        .then(setUsers)
        .catch(() => setUsers([]));
    }
  }, [isAdminOrManager]);

  // Resolve reporter / assignee display names. Prefer the directory the caller
  // already loaded, then fall back to a single-user lookup. Both are
  // best-effort: a caller without user-read rights simply sees the raw uid.
  useEffect(() => {
    const uid = task?.reportedBy;
    if (!uid || reporter?.uid === uid) return;

    const known = users.find((u) => u.uid === uid);
    if (known) {
      setReporter(known);
      return;
    }

    let cancelled = false;
    getUserByUid(uid)
      .then((profile) => {
        if (!cancelled) setReporter(profile);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [task?.reportedBy, users, reporter]);

  useEffect(() => {
    const uid = task?.assignedTo;
    if (!uid || assignee?.uid === uid) return;

    const known = users.find((u) => u.uid === uid);
    if (known) {
      setAssignee(known);
      return;
    }

    let cancelled = false;
    getUserByUid(uid)
      .then((profile) => {
        if (!cancelled) setAssignee(profile);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [task?.assignedTo, users, assignee]);

  const roomLabel = useMemo(
    () => `Room ${room?.roomNumber ?? task?.roomId ?? ''}`,
    [room, task]
  );

  const displayName = (profile: UserProfile | null, uid?: string | null) => {
    if (profile) {
      const name = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
      return name || profile.email;
    }
    return uid ? `${uid.slice(0, 10)}…` : '—';
  };

  const getUserName = (userUid: string) => {
    const profile = users.find((u) => u.uid === userUid);
    if (profile) {
      const name = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
      return name ? `${name} (${profile.email})` : profile.email;
    }
    return null;
  };

  const handleStart = async () => {
    if (!task) return;
    try {
      setSuccessMsg(null);
      setError(null);
      await startMaintenanceTask(task.taskId);
      setSuccessMsg('Task started. Status is now IN_PROGRESS.');
      await loadTask();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to start task.');
    }
  };

  const handleConfirmCancel = async () => {
    if (!task) return;
    try {
      setCancelLoading(true);
      setCancelError(null);
      await cancelMaintenanceTask(task.taskId);
      setCancelOpen(false);
      setSuccessMsg('Task cancelled.');
      await loadTask();
    } catch (err: any) {
      setCancelError(err?.response?.data?.message || 'Failed to cancel task.');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleSaveCost = async () => {
    if (!task) return;
    const parsed = Number.parseFloat(costDraft);

    if (Number.isNaN(parsed) || parsed < 0) {
      setCostError('Actual cost must be zero or greater.');
      return;
    }

    try {
      setCostSaving(true);
      setCostError(null);
      await updateMaintenanceCost(task.taskId, parsed);
      setSuccessMsg('Actual cost updated. The existing finance expense was synchronised.');
      await loadTask();
    } catch (err: any) {
      setCostError(err?.response?.data?.message || 'Failed to update cost.');
    } finally {
      setCostSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        <span className="ml-3 text-sm text-gray-500">Loading task…</span>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error || 'Maintenance task not found.'}
        <button
          type="button"
          onClick={() => navigate('/maintenance/tasks')}
          className="ml-3 font-semibold underline"
        >
          Back to tasks
        </button>
      </div>
    );
  }

  const status = STATUS_BADGE[task.status];
  const isAssignedToMe = task.assignedTo === user?.uid;
  const canStart = isMaintenance && isAssignedToMe && task.status === 'ASSIGNED';
  const canComplete = isMaintenance && isAssignedToMe && task.status === 'IN_PROGRESS';
  const isOpen = task.status !== 'COMPLETED' && task.status !== 'CANCELLED';
  const canAssign = isAdminOrManager && isOpen;
  const canCancel = isAdminOrManager && isOpen;
  const canEditCost = isAdminOrManager && task.status === 'COMPLETED';

  const timeline = [
    { label: 'Reported', value: task.createdAt },
    { label: 'Started', value: task.startedAt },
    { label: 'Completed', value: task.completedAt },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumbs + actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link to="/maintenance" className="hover:text-gray-700">
              Maintenance
            </Link>
            <span>/</span>
            <Link to="/maintenance/tasks" className="hover:text-gray-700">
              Tasks
            </Link>
            <span>/</span>
            <span className="font-mono text-gray-900">{task.taskId.slice(0, 8)}…</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            {ISSUE_TYPE_LABEL[task.issueType] ?? task.issueType} — {roomLabel}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canStart && (
            <button
              type="button"
              onClick={handleStart}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
            >
              Start Task
            </button>
          )}
          {canComplete && (
            <button
              type="button"
              onClick={() => setCompleteOpen(true)}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
            >
              Complete Task
            </button>
          )}
          {canAssign && (
            <button
              type="button"
              onClick={() => setAssignOpen(true)}
              className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition"
            >
              {task.assignedTo ? 'Reassign Staff' : 'Assign Staff'}
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 transition"
            >
              Cancel Task
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main detail */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Task Details</h2>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${status.cls}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
            </div>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Room
                </dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {roomLabel}
                  {room && (
                    <span className="block text-xs text-gray-500">
                      Floor {room.floor} · {room.roomType} · {room.status}
                    </span>
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Priority
                </dt>
                <dd className="mt-1">
                  <span className={`inline-block rounded border px-2 py-0.5 text-xs font-semibold ${PRIORITY_BADGE[task.priority]}`}>
                    {task.priority}
                  </span>
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Issue Type
                </dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {ISSUE_TYPE_LABEL[task.issueType] ?? task.issueType}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Actual Cost
                </dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {formatCurrency(task.actualCost)}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Reported By
                </dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {displayName(reporter, task.reportedBy)}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Assigned To
                </dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {task.assignedTo ? (
                    displayName(assignee, task.assignedTo)
                  ) : (
                    <span className="italic text-gray-400">Unassigned</span>
                  )}
                </dd>
              </div>
            </dl>

            <div className="mt-5 pt-5 border-t border-gray-100">
              <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Description
              </dt>
              <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">
                {task.description}
              </p>
            </div>

            {task.completionNotes && (
              <div className="mt-5 pt-5 border-t border-gray-100">
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Completion Information
                </dt>
                <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">
                  {task.completionNotes}
                </p>
              </div>
            )}
          </div>

          {/* Cost adjustment (completed tasks only) */}
          {canEditCost && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">Adjust Actual Cost</h2>
              <p className="mt-1 text-xs text-gray-500">
                Updating the cost synchronises the existing finance expense rather than
                creating a second record. Setting it to zero cancels the expense.
              </p>

              {costError && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {costError}
                </div>
              )}

              <div className="mt-4 flex items-end gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Actual Cost
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={costDraft}
                    onChange={(e) => setCostDraft(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveCost}
                  disabled={costSaving}
                  className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition"
                >
                  {costSaving ? 'Saving…' : 'Update Cost'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900">Timeline</h2>
            <ul className="mt-4 space-y-4">
              {timeline.map((entry) => (
                <li key={entry.label} className="flex items-start gap-3">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      entry.value ? 'bg-indigo-500' : 'bg-gray-300'
                    }`}
                  />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      {entry.label}
                    </p>
                    <p className="text-sm text-gray-800">{formatDateTime(entry.value)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900">Room Status</h2>
            {room ? (
              <>
                <p className="mt-3 text-2xl font-bold text-gray-900">{room.status}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {room.status === 'MAINTENANCE'
                    ? 'Held by maintenance while this task is open.'
                    : 'Released from maintenance.'}
                </p>
                <p className="mt-3 text-xs text-gray-400">
                  On completion the room returns to the state required by housekeeping or
                  an active reservation — it is not forced to AVAILABLE.
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-gray-400">Room details unavailable.</p>
            )}
          </div>
        </div>
      </div>

      {assignOpen && (
        <AssignTaskModal
          taskId={task.taskId}
          roomLabel={roomLabel}
          currentAssignee={task.assignedTo}
          staffList={staffList}
          getUserName={getUserName}
          onClose={() => setAssignOpen(false)}
          onAssigned={async () => {
            setSuccessMsg('Task assigned successfully.');
            await loadTask();
          }}
        />
      )}

      {completeOpen && (
        <CompleteTaskModal
          taskId={task.taskId}
          roomLabel={roomLabel}
          onClose={() => setCompleteOpen(false)}
          onCompleted={async () => {
            setSuccessMsg('Task completed. Room status and finance records updated.');
            await loadTask();
          }}
        />
      )}

      {cancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-gray-900">Cancel Maintenance Task?</h3>
            <p className="text-sm text-gray-600">
              Are you sure you want to cancel this task for <strong>{roomLabel}</strong>? The
              room will be released from maintenance.
            </p>

            {cancelError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {cancelError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelOpen(false)}
                disabled={cancelLoading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Keep Task
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelLoading}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {cancelLoading ? 'Cancelling…' : 'Yes, Cancel Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
