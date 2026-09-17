import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getAllTasks,
  startMaintenanceTask,
  cancelMaintenanceTask,
  getEligibleMaintenanceStaff,
} from '../../services/maintenanceService';
import { getRooms } from '../../services/roomService';
import { getAllUsers } from '../../services/userService';
import AssignTaskModal from './components/AssignTaskModal';
import CompleteTaskModal from './components/CompleteTaskModal';
import {
  STATUS_BADGE,
  PRIORITY_BADGE,
  ISSUE_TYPE_LABEL,
  ISSUE_TYPES,
  PRIORITIES,
  STATUSES,
  formatCurrency,
  formatDateTime,
} from './maintenanceMeta';
import type {
  MaintenanceTask,
  MaintenanceStatus,
  MaintenancePriority,
  MaintenanceIssueType,
} from '../../types/maintenance';
import type { Room } from '../../types/room';
import type { Staff } from '../../types/staff';
import type { UserProfile } from '../../types/user';

export default function MaintenanceTasks() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const isMaintenance = user?.role === 'MAINTENANCE';
  const canCreate = isAdminOrManager || user?.role === 'RECEPTIONIST';

  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | 'ALL'>(
    (searchParams.get('status') as MaintenanceStatus) || 'ALL'
  );
  const [priorityFilter, setPriorityFilter] = useState<MaintenancePriority | 'ALL'>('ALL');
  const [issueTypeFilter, setIssueTypeFilter] = useState<MaintenanceIssueType | 'ALL'>('ALL');
  const [assignedFilter, setAssignedFilter] = useState<string>('ALL');
  const [roomFilter, setRoomFilter] = useState<string>('');

  // Modals
  const [assignModalTask, setAssignModalTask] = useState<MaintenanceTask | null>(null);
  const [completeModalTask, setCompleteModalTask] = useState<MaintenanceTask | null>(null);
  const [cancelModalTask, setCancelModalTask] = useState<MaintenanceTask | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);

      const [tasksData, roomsData, eligibleStaff, allUsers] = await Promise.all([
        getAllTasks(),
        getRooms().catch(() => [] as Room[]),
        isAdminOrManager
          ? getEligibleMaintenanceStaff().catch(() => [] as Staff[])
          : Promise.resolve([] as Staff[]),
        user?.role === 'ADMIN'
          ? getAllUsers().catch(() => [] as UserProfile[])
          : Promise.resolve([] as UserProfile[]),
      ]);

      setTasks(tasksData);
      setRooms(roomsData);
      setStaffList(eligibleStaff);
      setUsers(allUsers);
    } catch {
      setError('Failed to load maintenance tasks.');
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

  const roomLabel = useCallback(
    (roomId: string) => `Room ${roomMap.get(roomId)?.roomNumber ?? roomId}`,
    [roomMap]
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (statusFilter !== 'ALL' && task.status !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) return false;
      if (issueTypeFilter !== 'ALL' && task.issueType !== issueTypeFilter) return false;

      if (assignedFilter === 'UNASSIGNED' && task.assignedTo) return false;
      if (assignedFilter !== 'ALL' && assignedFilter !== 'UNASSIGNED') {
        if (task.assignedTo !== assignedFilter) return false;
      }

      if (roomFilter.trim()) {
        const q = roomFilter.toLowerCase().trim();
        const room = roomMap.get(task.roomId);
        const matchesNumber = room?.roomNumber?.toLowerCase().includes(q);
        const matchesId = task.roomId.toLowerCase().includes(q);
        if (!matchesNumber && !matchesId) return false;
      }

      return true;
    });
  }, [tasks, statusFilter, priorityFilter, issueTypeFilter, assignedFilter, roomFilter, roomMap]);

  const handleStartTask = async (taskId: string) => {
    try {
      setActionLoadingId(taskId);
      setSuccessMsg(null);
      await startMaintenanceTask(taskId);
      setSuccessMsg('Task started. Status is now IN_PROGRESS.');
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to start task.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalTask) return;
    try {
      setCancelLoading(true);
      setCancelError(null);
      await cancelMaintenanceTask(cancelModalTask.taskId);
      setSuccessMsg('Task cancelled.');
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
            <Link to="/maintenance" className="text-sm font-medium text-gray-500 hover:text-gray-700">
              Maintenance
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-sm font-medium text-gray-900">Tasks</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Maintenance Tasks</h1>
          <p className="mt-0.5 text-sm text-gray-600">
            Report, assign, start, complete, and track repair work across the property.
          </p>
        </div>

        {canCreate && (
          <Link
            to="/maintenance/tasks/new"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Report Issue
          </Link>
        )}
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMsg}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as MaintenanceStatus | 'ALL')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_BADGE[s].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Priority
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as MaintenancePriority | 'ALL')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Priorities</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Issue Type
            </label>
            <select
              value={issueTypeFilter}
              onChange={(e) => setIssueTypeFilter(e.target.value as MaintenanceIssueType | 'ALL')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Issue Types</option>
              {ISSUE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ISSUE_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>

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

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => {
              setStatusFilter('ALL');
              setPriorityFilter('ALL');
              setIssueTypeFilter('ALL');
              setAssignedFilter('ALL');
              setRoomFilter('');
            }}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3 text-sm text-gray-500">
          {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} found
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <span className="ml-3 text-sm text-gray-500">Loading tasks…</span>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            No maintenance tasks match your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Task ID</th>
                  <th className="px-4 py-3 text-left">Room</th>
                  <th className="px-4 py-3 text-left">Issue Type</th>
                  <th className="px-4 py-3 text-left">Priority</th>
                  <th className="px-4 py-3 text-left">Assigned Staff</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actual Cost</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTasks.map((task) => {
                  const room = roomMap.get(task.roomId);
                  const staff = task.assignedTo ? staffMap.get(task.assignedTo) : null;
                  const status = STATUS_BADGE[task.status];

                  const isAssignedToMe = task.assignedTo === user?.uid;
                  const isOpen = task.status !== 'COMPLETED' && task.status !== 'CANCELLED';
                  const canStart = isMaintenance && isAssignedToMe && task.status === 'ASSIGNED';
                  const canComplete = isMaintenance && isAssignedToMe && task.status === 'IN_PROGRESS';
                  const canAssign = isAdminOrManager && isOpen;
                  const canCancel = isAdminOrManager && isOpen;

                  return (
                    <tr key={task.taskId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        {task.taskId.slice(0, 8)}…
                      </td>

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

                      <td className="px-4 py-3 text-gray-800 font-medium">
                        {ISSUE_TYPE_LABEL[task.issueType] ?? task.issueType}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`inline-block rounded border px-2 py-0.5 text-xs font-semibold ${PRIORITY_BADGE[task.priority]}`}>
                          {task.priority}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-xs">
                        {staff ? (
                          <div>
                            <span className="font-semibold text-gray-900">{staff.employeeId}</span>
                            <span className="block text-gray-400">{staff.position}</span>
                          </div>
                        ) : task.assignedTo ? (
                          <span className="font-mono text-gray-500">
                            {task.assignedTo.slice(0, 8)}…
                          </span>
                        ) : (
                          <span className="italic text-gray-400">Unassigned</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${status.cls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-xs font-medium text-gray-700">
                        {formatCurrency(task.actualCost)}
                      </td>

                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatDateTime(task.createdAt)}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/maintenance/tasks/${task.taskId}`}
                            className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                          >
                            Details
                          </Link>

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

                          {canComplete && (
                            <button
                              type="button"
                              onClick={() => setCompleteModalTask(task)}
                              className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                            >
                              Complete
                            </button>
                          )}

                          {canAssign && (
                            <button
                              type="button"
                              onClick={() => setAssignModalTask(task)}
                              className="rounded border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                            >
                              {task.assignedTo ? 'Reassign' : 'Assign'}
                            </button>
                          )}

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

      {/* Assign modal */}
      {assignModalTask && (
        <AssignTaskModal
          taskId={assignModalTask.taskId}
          roomLabel={roomLabel(assignModalTask.roomId)}
          currentAssignee={assignModalTask.assignedTo}
          staffList={staffList}
          getUserName={getUserName}
          onClose={() => setAssignModalTask(null)}
          onAssigned={async () => {
            setSuccessMsg('Task assigned successfully.');
            await loadData();
          }}
        />
      )}

      {/* Complete modal */}
      {completeModalTask && (
        <CompleteTaskModal
          taskId={completeModalTask.taskId}
          roomLabel={roomLabel(completeModalTask.roomId)}
          onClose={() => setCompleteModalTask(null)}
          onCompleted={async () => {
            setSuccessMsg('Task completed. Room status and finance records updated.');
            await loadData();
          }}
        />
      )}

      {/* Cancel confirmation */}
      {cancelModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <h3 className="text-base font-bold text-gray-900">Cancel Maintenance Task?</h3>
            </div>
            <p className="text-sm text-gray-600">
              Are you sure you want to cancel the{' '}
              <strong>{ISSUE_TYPE_LABEL[cancelModalTask.issueType]}</strong> task for{' '}
              <strong>{roomLabel(cancelModalTask.roomId)}</strong>? The room will be released
              from maintenance.
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
