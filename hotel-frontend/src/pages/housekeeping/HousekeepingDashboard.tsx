import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getAllTasks,
  getMyTasks,
  startHousekeepingTask,
  completeHousekeepingTask,
} from '../../services/housekeepingService';
import { getRooms } from '../../services/roomService';
import type { HousekeepingTask, HousekeepingTaskStatus } from '../../types/housekeeping';
import type { Room } from '../../types/room';

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

export default function HousekeepingDashboard() {
  const { user } = useAuth();

  const isStaff = user?.role === 'HOUSEKEEPING';
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [allTasks, setAllTasks] = useState<HousekeepingTask[]>([]);
  const [myTasks, setMyTasks] = useState<HousekeepingTask[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [tasksData, roomsData] = await Promise.all([
        getAllTasks().catch(() => []),
        getRooms().catch(() => []),
      ]);

      setAllTasks(tasksData);
      setRooms(roomsData);

      if (isStaff) {
        const myTasksData = await getMyTasks().catch(() => []);
        setMyTasks(myTasksData);
      }
    } catch {
      setError('Failed to load housekeeping dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [isStaff]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Create room lookup map for quick number lookups
  const roomMap = useMemo(() => {
    const map = new Map<string, Room>();
    rooms.forEach((r) => map.set(r.roomId, r));
    return map;
  }, [rooms]);

  // Summary Metrics
  const pendingCount = useMemo(
    () => allTasks.filter((t) => t.status === 'PENDING').length,
    [allTasks]
  );
  const assignedCount = useMemo(
    () => allTasks.filter((t) => t.status === 'ASSIGNED').length,
    [allTasks]
  );
  const inProgressCount = useMemo(
    () => allTasks.filter((t) => t.status === 'IN_PROGRESS').length,
    [allTasks]
  );

  const completedTodayCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return allTasks.filter((t) => {
      if (t.status !== 'COMPLETED' || !t.completedAt) return false;
      return t.completedAt.startsWith(todayStr);
    }).length;
  }, [allTasks]);

  const urgentCount = useMemo(
    () =>
      allTasks.filter(
        (t) =>
          t.priority === 'URGENT' &&
          t.status !== 'COMPLETED' &&
          t.status !== 'CANCELLED'
      ).length,
    [allTasks]
  );

  // Quick action for housekeeping staff: Start task
  const handleStartTask = async (taskId: string) => {
    try {
      setActionLoadingId(taskId);
      setActionSuccess(null);
      await startHousekeepingTask(taskId);
      setActionSuccess('Task started successfully! Status is now IN_PROGRESS.');
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to start task.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Quick action for housekeeping staff: Complete task
  const handleCompleteTask = async (taskId: string) => {
    try {
      setActionLoadingId(taskId);
      setActionSuccess(null);
      await completeHousekeepingTask(taskId);
      setActionSuccess('Task completed successfully! Room status has been updated.');
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to complete task.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Housekeeping staff active tasks (assigned or in progress)
  const myActiveTasks = useMemo(() => {
    const source = isStaff ? myTasks : allTasks.filter((t) => t.assignedTo === user?.uid);
    return source.filter(
      (t) => t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS'
    );
  }, [isStaff, myTasks, allTasks, user]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Housekeeping Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Monitor cleaning tasks, room readiness, and staff assignments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/housekeeping/tasks"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm0 5.25h.007v.008H3.75V12zm0 5.25h.007v.008H3.75v-.008z" />
            </svg>
            All Tasks
          </Link>
          {isAdminOrManager && (
            <Link
              to="/housekeeping/tasks/new"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Cleaning Task
            </Link>
          )}
        </div>
      </div>

      {/* Alerts */}
      {actionSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <svg className="h-5 w-5 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {actionSuccess}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 5 Summary Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Pending Tasks */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
              Pending
            </span>
            <span className="rounded-full bg-amber-50 p-2 text-amber-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">{pendingCount}</p>
          <p className="mt-1 text-xs text-gray-500">Awaiting staff assignment</p>
        </div>

        {/* Assigned Tasks */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Assigned
            </span>
            <span className="rounded-full bg-blue-50 p-2 text-blue-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">{assignedCount}</p>
          <p className="mt-1 text-xs text-gray-500">Ready to start</p>
        </div>

        {/* In-Progress Tasks */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-600">
              In Progress
            </span>
            <span className="rounded-full bg-purple-50 p-2 text-purple-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">{inProgressCount}</p>
          <p className="mt-1 text-xs text-gray-500">Currently being cleaned</p>
        </div>

        {/* Completed Today */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Completed Today
            </span>
            <span className="rounded-full bg-emerald-50 p-2 text-emerald-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">{completedTodayCount}</p>
          <p className="mt-1 text-xs text-gray-500">Rooms cleaned & ready</p>
        </div>

        {/* Urgent Tasks */}
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-700">
              Urgent Tasks
            </span>
            <span className="rounded-full bg-red-100 p-2 text-red-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-red-700">{urgentCount}</p>
          <p className="mt-1 text-xs text-red-600">Requires priority action</p>
        </div>
      </div>

      {/* Housekeeping Staff: My Active Tasks Section */}
      {isStaff && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">My Active Cleaning Tasks</h2>
              <p className="text-xs text-gray-500">Tasks assigned specifically to you</p>
            </div>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
              {myActiveTasks.length} Active
            </span>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500">Loading your tasks…</div>
          ) : myActiveTasks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 py-10 text-center">
              <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2 text-sm text-gray-500 font-medium">No active tasks assigned to you</p>
              <p className="text-xs text-gray-400">Enjoy your break or check with management for new assignments.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myActiveTasks.map((task) => {
                const room = roomMap.get(task.roomId);
                const status = STATUS_BADGE[task.status];
                const priorityCls = PRIORITY_BADGE[task.priority];

                return (
                  <div
                    key={task.taskId}
                    className="flex flex-col justify-between rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow bg-gray-50/50"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-bold text-gray-900">
                            Room {room?.roomNumber ?? task.roomId}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {room ? `Floor ${room.floor} · ${room.roomType}` : task.roomId}
                          </p>
                        </div>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${status.cls}`}>
                          {status.label}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5 text-xs text-gray-600">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Type:</span>
                          <span className="font-medium text-gray-800">
                            {TYPE_LABEL[task.taskType] ?? task.taskType}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Priority:</span>
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${priorityCls}`}>
                            {task.priority}
                          </span>
                        </div>
                        {task.notes && (
                          <div className="pt-1">
                            <span className="text-gray-400">Notes:</span>
                            <p className="mt-0.5 italic text-gray-700 bg-white p-2 rounded border border-gray-200">
                              "{task.notes}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-4 pt-3 border-t border-gray-200 flex gap-2">
                      {task.status === 'ASSIGNED' && (
                        <button
                          type="button"
                          disabled={actionLoadingId === task.taskId}
                          onClick={() => handleStartTask(task.taskId)}
                          className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition"
                        >
                          {actionLoadingId === task.taskId ? 'Starting…' : 'Start Task'}
                        </button>
                      )}
                      {task.status === 'IN_PROGRESS' && (
                        <button
                          type="button"
                          disabled={actionLoadingId === task.taskId}
                          onClick={() => handleCompleteTask(task.taskId)}
                          className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
                        >
                          {actionLoadingId === task.taskId ? 'Completing…' : 'Complete Task'}
                        </button>
                      )}
                      <Link
                        to={`/housekeeping/tasks/${task.taskId}`}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Urgent / Priority Tasks Queue */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Recent & Active Housekeeping Tasks</h2>
            <p className="text-xs text-gray-500">Tasks requiring cleaning or inspection</p>
          </div>
          <Link
            to="/housekeeping/tasks"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            View all ({allTasks.length}) →
          </Link>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-gray-500">Loading tasks…</div>
        ) : allTasks.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">No housekeeping tasks recorded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Room</th>
                  <th className="px-4 py-3 text-left">Task Type</th>
                  <th className="px-4 py-3 text-left">Priority</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allTasks.slice(0, 5).map((task) => {
                  const room = roomMap.get(task.roomId);
                  const status = STATUS_BADGE[task.status];
                  const priorityCls = PRIORITY_BADGE[task.priority];

                  return (
                    <tr key={task.taskId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        Room {room?.roomNumber ?? task.roomId}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {TYPE_LABEL[task.taskType] ?? task.taskType}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded border px-2 py-0.5 text-xs font-semibold ${priorityCls}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${status.cls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(task.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/housekeeping/tasks/${task.taskId}`}
                          className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
