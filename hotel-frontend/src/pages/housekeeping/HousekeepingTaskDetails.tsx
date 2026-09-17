import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getTaskById,
  startHousekeepingTask,
  completeHousekeepingTask,
  assignHousekeepingTask,
  cancelHousekeepingTask,
  getEligibleHousekeepingStaff,
} from '../../services/housekeepingService';
import { getRoomById } from '../../services/roomService';
import { getAllUsers } from '../../services/userService';
import type { HousekeepingTask, HousekeepingTaskStatus } from '../../types/housekeeping';
import type { Room } from '../../types/room';
import type { Staff } from '../../types/staff';
import type { UserProfile } from '../../types/user';

const STATUS_BADGE: Record<HousekeepingTaskStatus, { label: string; cls: string; dot: string }> = {
  PENDING: { label: 'Pending', cls: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  ASSIGNED: { label: 'Assigned', cls: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500' },
  IN_PROGRESS: { label: 'In Progress', cls: 'bg-purple-100 text-purple-800 border-purple-200', dot: 'bg-purple-500' },
  COMPLETED: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400' },
};

const PRIORITY_BADGE = {
  LOW: 'bg-slate-100 text-slate-700 border-slate-200',
  MEDIUM: 'bg-blue-100 text-blue-700 border-blue-200',
  HIGH: 'bg-amber-100 text-amber-800 border-amber-200',
  URGENT: 'bg-red-100 text-red-800 border-red-200 animate-pulse',
};

const TYPE_LABEL = {
  CHECKOUT_CLEANING: 'Checkout Cleaning',
  REGULAR_CLEANING: 'Regular Cleaning',
  DEEP_CLEANING: 'Deep Cleaning',
  INSPECTION: 'Inspection',
};

export default function HousekeepingTaskDetails() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const isHousekeeping = user?.role === 'HOUSEKEEPING';

  const [task, setTask] = useState<HousekeepingTask | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [assignedStaff, setAssignedStaff] = useState<Staff | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Assign Modal
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedStaffUid, setSelectedStaffUid] = useState<string>('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Cancel Modal
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Action Loading
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!taskId) return;
    try {
      const [taskData, eligibleStaff, allUsers] = await Promise.all([
        getTaskById(taskId),
        isAdminOrManager ? getEligibleHousekeepingStaff().catch(() => []) : Promise.resolve([]),
        user?.role === 'ADMIN' ? getAllUsers().catch(() => []) : Promise.resolve([]),
      ]);

      setTask(taskData);
      setUsers(allUsers);

      // Merge any user with role HOUSEKEEPING who isn't already in eligibleStaff
      const mergedStaff = [...eligibleStaff];
      const existingUids = new Set(eligibleStaff.map((s) => s.userUid));

      allUsers
        .filter((u) => u.role === 'HOUSEKEEPING' && u.enabled !== false)
        .forEach((u) => {
          if (!existingUids.has(u.uid)) {
            mergedStaff.push({
              staffId: u.uid,
              userUid: u.uid,
              employeeId: 'EMP-' + (u.uid.length >= 6 ? u.uid.substring(0, 6).toUpperCase() : u.uid.toUpperCase()),
              department: 'HOUSEKEEPING',
              position: 'Housekeeper',
              hireDate: new Date().toISOString().split('T')[0],
              salary: 0,
              employmentStatus: 'ACTIVE',
            });
            existingUids.add(u.uid);
          }
        });

      setStaffList(mergedStaff);

      if (taskData.assignedTo) {
        const found = mergedStaff.find((s) => s.userUid === taskData.assignedTo);
        if (found) setAssignedStaff(found);
      }

      // Fetch Room
      try {
        const roomData = await getRoomById(taskData.roomId);
        setRoom(roomData);
      } catch {
        // Room may not load if non-admin/manager
      }
    } catch {
      setError('Housekeeping task not found or failed to load.');
    } finally {
      setLoading(false);
    }
  }, [taskId, isAdminOrManager, user]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const getUserName = (userUid: string) => {
    const u = users.find((usr) => usr.uid === userUid);
    if (u) {
      const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
      return name ? `${name} (${u.email})` : u.email;
    }
    return null;
  };

  const isAssignedToMe = task?.assignedTo === user?.uid;
  const canStart = isHousekeeping && isAssignedToMe && task?.status === 'ASSIGNED';
  const canComplete = isHousekeeping && isAssignedToMe && task?.status === 'IN_PROGRESS';
  const canAssign = isAdminOrManager && task?.status !== 'COMPLETED' && task?.status !== 'CANCELLED';
  const canCancel = isAdminOrManager && task?.status !== 'COMPLETED' && task?.status !== 'CANCELLED';

  // Handle Start Task
  const handleStartTask = async () => {
    if (!taskId) return;
    try {
      setActionLoading(true);
      setSuccessMsg(null);
      await startHousekeepingTask(taskId);
      setSuccessMsg('Task started successfully! Status updated to IN_PROGRESS.');
      await fetchDetails();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to start task.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Complete Task
  const handleCompleteTask = async () => {
    if (!taskId) return;
    try {
      setActionLoading(true);
      setSuccessMsg(null);
      await completeHousekeepingTask(taskId);
      setSuccessMsg('Task completed successfully! Room status has been refreshed.');
      await fetchDetails();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to complete task.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Confirm Assignment
  const handleConfirmAssign = async () => {
    if (!taskId || !selectedStaffUid) return;
    try {
      setAssignLoading(true);
      setAssignError(null);
      await assignHousekeepingTask(taskId, selectedStaffUid);
      setSuccessMsg('Staff assigned successfully.');
      setIsAssignOpen(false);
      await fetchDetails();
    } catch (err: any) {
      setAssignError(err?.response?.data?.message || 'Failed to assign staff.');
    } finally {
      setAssignLoading(false);
    }
  };

  // Handle Confirm Cancel
  const handleConfirmCancel = async () => {
    if (!taskId) return;
    try {
      setCancelLoading(true);
      setCancelError(null);
      await cancelHousekeepingTask(taskId);
      setSuccessMsg('Task has been cancelled.');
      setIsCancelOpen(false);
      await fetchDetails();
    } catch (err: any) {
      setCancelError(err?.response?.data?.message || 'Failed to cancel task.');
    } finally {
      setCancelLoading(false);
    }
  };

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        <span className="ml-3 text-sm text-gray-500">Loading task details…</span>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-700 font-medium">{error || 'Task not found.'}</p>
        <Link
          to="/housekeeping/tasks"
          className="mt-4 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-800"
        >
          ← Back to Housekeeping Tasks
        </Link>
      </div>
    );
  }

  const status = STATUS_BADGE[task.status];
  const priorityCls = PRIORITY_BADGE[task.priority];

  return (
    <div className="max-w-4xl space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link to="/housekeeping" className="hover:text-gray-700">
            Housekeeping
          </Link>
          <span>/</span>
          <Link to="/housekeeping/tasks" className="hover:text-gray-700">
            Tasks
          </Link>
          <span>/</span>
          <span className="font-mono text-xs text-gray-900">{task.taskId.slice(0, 8)}</span>
        </div>

        <button
          type="button"
          onClick={() => navigate('/housekeeping/tasks')}
          className="text-xs font-semibold text-gray-600 hover:text-gray-900"
        >
          ← Back to list
        </button>
      </div>

      {/* Title & Status Banner */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {TYPE_LABEL[task.taskType] ?? task.taskType}
              </h1>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold ${status.cls}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Task ID: <span className="font-mono">{task.taskId}</span>
            </p>
          </div>

          {/* Quick Primary Actions */}
          <div className="flex flex-wrap gap-2">
            {canStart && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleStartTask}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-60 transition"
              >
                {actionLoading ? 'Starting…' : 'Start Task'}
              </button>
            )}

            {canComplete && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleCompleteTask}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60 transition"
              >
                {actionLoading ? 'Completing…' : 'Complete Task'}
              </button>
            )}

            {canAssign && (
              <button
                type="button"
                onClick={() => {
                  setSelectedStaffUid(task.assignedTo || '');
                  setIsAssignOpen(true);
                  setAssignError(null);
                }}
                className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition"
              >
                {task.assignedTo ? 'Reassign Staff' : 'Assign Staff'}
              </button>
            )}

            {canCancel && (
              <button
                type="button"
                onClick={() => {
                  setIsCancelOpen(true);
                  setCancelError(null);
                }}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 transition"
              >
                Cancel Task
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <svg className="h-5 w-5 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {successMsg}
        </div>
      )}

      {/* Grid: Room Details & Task Info */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Room Details Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-base font-bold text-gray-900">Room Details</h2>
            {room && (
              <Link
                to={`/rooms/${room.roomId}`}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                View Room →
              </Link>
            )}
          </div>

          {room ? (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Room Number</dt>
                <dd className="mt-1 text-base font-bold text-gray-900">Room {room.roomNumber}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Current Status</dt>
                <dd className="mt-1">
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-800">
                    {room.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Room Type</dt>
                <dd className="mt-1 font-medium text-gray-800">{room.roomType}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Floor</dt>
                <dd className="mt-1 font-medium text-gray-800">Floor {room.floor}</dd>
              </div>
            </dl>
          ) : (
            <div>
              <p className="text-sm font-semibold text-gray-800">Room ID: {task.roomId}</p>
              <p className="text-xs text-gray-400">Room details are restricted or unavailable.</p>
            </div>
          )}

          {/* Checkout Cleaning Status note */}
          {task.taskType === 'CHECKOUT_CLEANING' && (
            <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800 border border-blue-200">
              ℹ️ When this checkout cleaning task is completed, the room status will automatically transition to{' '}
              <strong>AVAILABLE</strong> (unless placed in maintenance).
            </div>
          )}
        </div>

        {/* Task Details Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-gray-900 border-b pb-3">Task Information</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Priority</dt>
              <dd className="mt-1">
                <span className={`inline-block rounded border px-2 py-0.5 text-xs font-semibold ${priorityCls}`}>
                  {task.priority}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Assigned Staff</dt>
              <dd className="mt-1 font-medium text-gray-800">
                {assignedStaff ? (
                  <span>
                    {getUserName(assignedStaff.userUid) || assignedStaff.employeeId} ({assignedStaff.employeeId} · {assignedStaff.position})
                  </span>
                ) : task.assignedTo ? (
                  <span>
                    {getUserName(task.assignedTo) || 'Housekeeper'} ({task.assignedTo.slice(0, 8)}…)
                  </span>
                ) : (
                  <span className="text-gray-400 italic">Unassigned</span>
                )}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Notes</dt>
              <dd className="mt-1 text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-200 italic">
                {task.notes || 'No notes provided.'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Timestamps & Lifecycle Audit */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-gray-900 border-b pb-3 mb-4">Task Lifecycle Timestamps</h2>
        <div className="grid gap-4 sm:grid-cols-3 text-sm">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-400 uppercase font-semibold">Created Time</p>
            <p className="mt-1 font-medium text-gray-900">{formatDateTime(task.createdAt)}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-400 uppercase font-semibold">Started Time</p>
            <p className="mt-1 font-medium text-gray-900">{formatDateTime(task.startedAt)}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-400 uppercase font-semibold">Completed Time</p>
            <p className="mt-1 font-medium text-gray-900">{formatDateTime(task.completedAt)}</p>
          </div>
        </div>
      </div>

      {/* ── ASSIGN STAFF MODAL ──────────────────────────────────────────────── */}
      {isAssignOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Assign Housekeeping Staff</h3>

            {assignError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {assignError}
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">
                Select Active Housekeeper
              </label>
              {staffList.length === 0 ? (
                <div className="p-3 text-xs text-amber-700 bg-amber-50 rounded-lg border border-amber-200">
                  No active staff found in the HOUSEKEEPING department.
                </div>
              ) : (
                <select
                  value={selectedStaffUid}
                  onChange={(e) => setSelectedStaffUid(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Choose staff member…</option>
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
                onClick={() => setIsAssignOpen(false)}
                disabled={assignLoading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleConfirmAssign}
                disabled={assignLoading || !selectedStaffUid}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {assignLoading ? 'Assigning…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CANCEL MODAL ────────────────────────────────────────────────────── */}
      {isCancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-red-600">Cancel Housekeeping Task?</h3>
            <p className="text-sm text-gray-600">
              Are you sure you want to cancel this housekeeping task? This action cannot be undone.
            </p>

            {cancelError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {cancelError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCancelOpen(false)}
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
