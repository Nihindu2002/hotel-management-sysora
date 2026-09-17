import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getAllTasks,
  startHousekeepingTask,
  completeHousekeepingTask,
  assignHousekeepingTask,
  cancelHousekeepingTask,
  getEligibleHousekeepingStaff,
} from '../../services/housekeepingService';
import { getRooms } from '../../services/roomService';
import { getAllUsers } from '../../services/userService';
import type {
  HousekeepingTask,
  HousekeepingTaskStatus,
  HousekeepingTaskPriority,
  HousekeepingTaskType,
} from '../../types/housekeeping';
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

const PRIORITY_BADGE: Record<HousekeepingTaskPriority, string> = {
  LOW: 'bg-slate-100 text-slate-700 border-slate-200',
  MEDIUM: 'bg-blue-100 text-blue-700 border-blue-200',
  HIGH: 'bg-amber-100 text-amber-800 border-amber-200',
  URGENT: 'bg-red-100 text-red-800 border-red-200 animate-pulse',
};

const TYPE_LABEL: Record<HousekeepingTaskType, string> = {
  CHECKOUT_CLEANING: 'Checkout Cleaning',
  REGULAR_CLEANING: 'Regular Cleaning',
  DEEP_CLEANING: 'Deep Cleaning',
  INSPECTION: 'Inspection',
};

export default function HousekeepingTasks() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const isHousekeeping = user?.role === 'HOUSEKEEPING';

  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter States
  const [statusFilter, setStatusFilter] = useState<HousekeepingTaskStatus | 'ALL'>(
    (searchParams.get('status') as HousekeepingTaskStatus) || 'ALL'
  );
  const [priorityFilter, setPriorityFilter] = useState<HousekeepingTaskPriority | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<HousekeepingTaskType | 'ALL'>('ALL');
  const [assignedFilter, setAssignedFilter] = useState<string>('ALL');
  const [roomFilter, setRoomFilter] = useState<string>('');

  // Assign Modal
  const [assignModalTask, setAssignModalTask] = useState<HousekeepingTask | null>(null);
  const [selectedStaffUid, setSelectedStaffUid] = useState<string>('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Cancel Modal
  const [cancelModalTask, setCancelModalTask] = useState<HousekeepingTask | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Quick Action Loading state
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [tasksData, roomsData, eligibleStaff, allUsers] = await Promise.all([
        getAllTasks(),
        getRooms().catch(() => []),
        isAdminOrManager ? getEligibleHousekeepingStaff().catch(() => []) : Promise.resolve([]),
        user?.role === 'ADMIN' ? getAllUsers().catch(() => []) : Promise.resolve([]),
      ]);

      setTasks(tasksData);
      setRooms(roomsData);
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
    } catch {
      setError('Failed to load housekeeping tasks.');
    } finally {
      setLoading(false);
    }
  }, [isAdminOrManager, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getUserName = (userUid: string) => {
    const u = users.find((usr) => usr.uid === userUid);
    if (u) {
      const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
      return name ? `${name} (${u.email})` : u.email;
    }
    return null;
  };

  const roomMap = useMemo(() => {
    const map = new Map<string, Room>();
    rooms.forEach((r) => map.set(r.roomId, r));
    return map;
  }, [rooms]);

  const staffMap = useMemo(() => {
    const map = new Map<string, Staff>();
    staffList.forEach((s) => map.set(s.userUid, s));
    return map;
  }, [staffList]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (statusFilter !== 'ALL' && task.status !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) return false;
      if (typeFilter !== 'ALL' && task.taskType !== typeFilter) return false;

      // Staff filter
      if (assignedFilter === 'UNASSIGNED' && task.assignedTo) return false;
      if (assignedFilter !== 'ALL' && assignedFilter !== 'UNASSIGNED') {
        if (task.assignedTo !== assignedFilter) return false;
      }

      // Room search / filter
      if (roomFilter.trim()) {
        const q = roomFilter.toLowerCase().trim();
        const room = roomMap.get(task.roomId);
        const matchesNumber = room?.roomNumber?.toLowerCase().includes(q);
        const matchesId = task.roomId.toLowerCase().includes(q);
        if (!matchesNumber && !matchesId) return false;
      }

      return true;
    });
  }, [tasks, statusFilter, priorityFilter, typeFilter, assignedFilter, roomFilter, roomMap]);

  // Start Task
  const handleStartTask = async (taskId: string) => {
    try {
      setActionLoadingId(taskId);
      setSuccessMsg(null);
      await startHousekeepingTask(taskId);
      setSuccessMsg('Task started! Status is now IN_PROGRESS.');
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to start task.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Complete Task
  const handleCompleteTask = async (taskId: string) => {
    try {
      setActionLoadingId(taskId);
      setSuccessMsg(null);
      await completeHousekeepingTask(taskId);
      setSuccessMsg('Task completed! Room status has been updated.');
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to complete task.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Confirm Assign
  const handleConfirmAssign = async () => {
    if (!assignModalTask || !selectedStaffUid) return;
    try {
      setAssignLoading(true);
      setAssignError(null);
      await assignHousekeepingTask(assignModalTask.taskId, selectedStaffUid);
      setSuccessMsg(`Task successfully assigned to staff!`);
      setAssignModalTask(null);
      setSelectedStaffUid('');
      await loadData();
    } catch (err: any) {
      setAssignError(err?.response?.data?.message || 'Failed to assign staff.');
    } finally {
      setAssignLoading(false);
    }
  };

  // Confirm Cancel
  const handleConfirmCancel = async () => {
    if (!cancelModalTask) return;
    try {
      setCancelLoading(true);
      setCancelError(null);
      await cancelHousekeepingTask(cancelModalTask.taskId);
      setSuccessMsg(`Task cancelled.`);
      setCancelModalTask(null);
      await loadData();
    } catch (err: any) {
      setCancelError(err?.response?.data?.message || 'Failed to cancel task.');
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/housekeeping" className="text-sm font-medium text-gray-500 hover:text-gray-700">
              Housekeeping
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-sm font-medium text-gray-900">Tasks</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Housekeeping Tasks</h1>
          <p className="mt-0.5 text-sm text-gray-600">
            View, assign, start, complete, and track room cleaning operations.
          </p>
        </div>

        {isAdminOrManager && (
          <Link
            to="/housekeeping/tasks/new"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Task
          </Link>
        )}
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <svg className="h-5 w-5 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {successMsg}
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Status Filter */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as HousekeepingTaskStatus | 'ALL')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Priority
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as HousekeepingTaskPriority | 'ALL')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {/* Task Type Filter */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Task Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as HousekeepingTaskType | 'ALL')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Types</option>
              <option value="CHECKOUT_CLEANING">Checkout Cleaning</option>
              <option value="REGULAR_CLEANING">Regular Cleaning</option>
              <option value="DEEP_CLEANING">Deep Cleaning</option>
              <option value="INSPECTION">Inspection</option>
            </select>
          </div>

          {/* Assigned Staff Filter */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Assigned Staff
            </label>
            <select
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All</option>
              <option value="UNASSIGNED">Unassigned</option>
              {staffList.map((s) => (
                <option key={s.userUid} value={s.userUid}>
                  {s.employeeId} ({s.position})
                </option>
              ))}
            </select>
          </div>

          {/* Room Filter */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Room
            </label>
            <input
              type="text"
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              placeholder="e.g. 101"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Clear Filters */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => {
              setStatusFilter('ALL');
              setPriorityFilter('ALL');
              setTypeFilter('ALL');
              setAssignedFilter('ALL');
              setRoomFilter('');
            }}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Task List Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3 text-sm text-gray-500 flex justify-between items-center">
          <span>{filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} found</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <span className="ml-3 text-sm text-gray-500">Loading tasks…</span>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            No housekeeping tasks match your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Task ID</th>
                  <th className="px-4 py-3 text-left">Room</th>
                  <th className="px-4 py-3 text-left">Task Type</th>
                  <th className="px-4 py-3 text-left">Priority</th>
                  <th className="px-4 py-3 text-left">Assigned Staff</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTasks.map((task) => {
                  const room = roomMap.get(task.roomId);
                  const staff = task.assignedTo ? staffMap.get(task.assignedTo) : null;
                  const status = STATUS_BADGE[task.status];
                  const priorityCls = PRIORITY_BADGE[task.priority];

                  const isAssignedToMe = task.assignedTo === user?.uid;
                  const canStart = isHousekeeping && isAssignedToMe && task.status === 'ASSIGNED';
                  const canComplete = isHousekeeping && isAssignedToMe && task.status === 'IN_PROGRESS';
                  const canAssign = isAdminOrManager && task.status !== 'COMPLETED' && task.status !== 'CANCELLED';
                  const canCancel = isAdminOrManager && task.status !== 'COMPLETED' && task.status !== 'CANCELLED';

                  return (
                    <tr key={task.taskId} className="hover:bg-gray-50 transition-colors">
                      {/* Task ID */}
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        {task.taskId.slice(0, 8)}…
                      </td>

                      {/* Room */}
                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-900">
                          Room {room?.roomNumber ?? task.roomId}
                        </span>
                        {room && (
                          <span className="block text-xs text-gray-400">
                            Floor {room.floor} · {room.roomType}
                          </span>
                        )}
                      </td>

                      {/* Task Type */}
                      <td className="px-4 py-3 text-gray-800 font-medium">
                        {TYPE_LABEL[task.taskType] ?? task.taskType}
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded border px-2 py-0.5 text-xs font-semibold ${priorityCls}`}>
                          {task.priority}
                        </span>
                      </td>

                      {/* Assigned Staff */}
                      <td className="px-4 py-3 text-xs">
                        {staff ? (
                          <div>
                            <span className="font-semibold text-gray-900">{staff.employeeId}</span>
                            <span className="block text-gray-400">{staff.position}</span>
                          </div>
                        ) : task.assignedTo ? (
                          <span className="font-mono text-gray-500">{task.assignedTo.slice(0, 8)}…</span>
                        ) : (
                          <span className="italic text-gray-400">Unassigned</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${status.cls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(task.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Details View */}
                          <Link
                            to={`/housekeeping/tasks/${task.taskId}`}
                            className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                          >
                            Details
                          </Link>

                          {/* Housekeeping Start Task */}
                          {canStart && (
                            <button
                              type="button"
                              disabled={actionLoadingId === task.taskId}
                              onClick={() => handleStartTask(task.taskId)}
                              className="rounded bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition"
                            >
                              {actionLoadingId === task.taskId ? 'Starting…' : 'Start'}
                            </button>
                          )}

                          {/* Housekeeping Complete Task */}
                          {canComplete && (
                            <button
                              type="button"
                              disabled={actionLoadingId === task.taskId}
                              onClick={() => handleCompleteTask(task.taskId)}
                              className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
                            >
                              {actionLoadingId === task.taskId ? 'Completing…' : 'Complete'}
                            </button>
                          )}

                          {/* Admin/Manager Assign Staff */}
                          {canAssign && (
                            <button
                              type="button"
                              onClick={() => {
                                setAssignModalTask(task);
                                setSelectedStaffUid(task.assignedTo || '');
                                setAssignError(null);
                              }}
                              className="rounded border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                            >
                              {task.assignedTo ? 'Reassign' : 'Assign'}
                            </button>
                          )}

                          {/* Admin/Manager Cancel Task */}
                          {canCancel && (
                            <button
                              type="button"
                              onClick={() => {
                                setCancelModalTask(task);
                                setCancelError(null);
                              }}
                              className="rounded border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── ASSIGN STAFF MODAL ──────────────────────────────────────────────── */}
      {assignModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Assign Housekeeping Staff</h3>
            <p className="text-sm text-gray-600">
              Assign task for <strong>Room {roomMap.get(assignModalTask.roomId)?.roomNumber ?? assignModalTask.roomId}</strong> ({TYPE_LABEL[assignModalTask.taskType]}).
            </p>

            {assignError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {assignError}
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">
                Eligible Housekeeping Staff (Active Only)
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
                onClick={() => {
                  setAssignModalTask(null);
                  setSelectedStaffUid('');
                }}
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
                {assignLoading ? 'Assigning…' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CANCEL TASK MODAL ───────────────────────────────────────────────── */}
      {cancelModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <h3 className="text-base font-bold text-gray-900">Cancel Housekeeping Task?</h3>
            </div>
            <p className="text-sm text-gray-600">
              Are you sure you want to cancel the <strong>{TYPE_LABEL[cancelModalTask.taskType]}</strong> for{' '}
              <strong>Room {roomMap.get(cancelModalTask.roomId)?.roomNumber ?? cancelModalTask.roomId}</strong>?
            </p>

            {cancelError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {cancelError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalTask(null)}
                disabled={cancelLoading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                No, Keep Task
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
