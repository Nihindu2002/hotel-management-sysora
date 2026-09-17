import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getDashboard,
  getAllTasks,
  getMyTasks,
  startMaintenanceTask,
} from '../../services/maintenanceService';
import { getRooms } from '../../services/roomService';
import CompleteTaskModal from './components/CompleteTaskModal';
import {
  STATUS_BADGE,
  PRIORITY_BADGE,
  ISSUE_TYPE_LABEL,
  formatCurrency,
  formatDateTime,
} from './maintenanceMeta';
import type { MaintenanceDashboardStats, MaintenanceTask } from '../../types/maintenance';
import type { Room } from '../../types/room';

const EMPTY_STATS: MaintenanceDashboardStats = {
  pendingTasks: 0,
  assignedTasks: 0,
  inProgressTasks: 0,
  completedToday: 0,
  highPriorityActiveTasks: 0,
  cancelledTasks: 0,
  totalTasks: 0,
  totalMaintenanceCost: 0,
};

export default function MaintenanceDashboard() {
  const { user } = useAuth();

  const isMaintenance = user?.role === 'MAINTENANCE';
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const canCreate = isAdminOrManager || user?.role === 'RECEPTIONIST';

  const [stats, setStats] = useState<MaintenanceDashboardStats>(EMPTY_STATS);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [myTasks, setMyTasks] = useState<MaintenanceTask[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [completeModalTask, setCompleteModalTask] = useState<MaintenanceTask | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);

      const [statsData, tasksData, roomsData, myTasksData] = await Promise.all([
        getDashboard().catch(() => EMPTY_STATS),
        getAllTasks().catch(() => [] as MaintenanceTask[]),
        getRooms().catch(() => [] as Room[]),
        isMaintenance
          ? getMyTasks().catch(() => [] as MaintenanceTask[])
          : Promise.resolve([] as MaintenanceTask[]),
      ]);

      setStats(statsData);
      setTasks(tasksData);
      setRooms(roomsData);
      setMyTasks(myTasksData);
    } catch {
      setError('Failed to load maintenance dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [isMaintenance]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const roomMap = useMemo(() => {
    const map = new Map<string, Room>();
    rooms.forEach((r) => map.set(r.roomId, r));
    return map;
  }, [rooms]);

  const roomLabel = useCallback(
    (roomId: string) => `Room ${roomMap.get(roomId)?.roomNumber ?? roomId}`,
    [roomMap]
  );

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

  const myActiveTasks = useMemo(() => {
    const source = isMaintenance
      ? myTasks
      : tasks.filter((t) => t.assignedTo === user?.uid);
    return source.filter(
      (t) => t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS'
    );
  }, [isMaintenance, myTasks, tasks, user]);

  const urgentQueue = useMemo(
    () =>
      tasks
        .filter(
          (t) =>
            (t.priority === 'URGENT' || t.priority === 'HIGH') &&
            t.status !== 'COMPLETED' &&
            t.status !== 'CANCELLED'
        )
        .sort((a, b) => (a.priority === 'URGENT' ? 0 : 1) - (b.priority === 'URGENT' ? 0 : 1))
        .slice(0, 5),
    [tasks]
  );

  const metricCards = [
    {
      label: 'Pending',
      value: stats.pendingTasks,
      hint: 'Awaiting assignment',
      tone: 'text-amber-600',
      chip: 'bg-amber-50 text-amber-600',
      icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
      label: 'Assigned',
      value: stats.assignedTasks,
      hint: 'Ready to start',
      tone: 'text-blue-600',
      chip: 'bg-blue-50 text-blue-600',
      icon: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
    },
    {
      label: 'In Progress',
      value: stats.inProgressTasks,
      hint: 'Being repaired',
      tone: 'text-purple-600',
      chip: 'bg-purple-50 text-purple-600',
      icon: 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99',
    },
    {
      label: 'Completed Today',
      value: stats.completedToday,
      hint: 'Closed out today',
      tone: 'text-emerald-600',
      chip: 'bg-emerald-50 text-emerald-600',
      icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track reported issues, assignments, repair progress, and maintenance spend.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/maintenance/tasks"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            All Tasks
          </Link>
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
      </div>

      {/* Alerts */}
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

      {/* Summary Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {metricCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold uppercase tracking-wider ${card.tone}`}>
                {card.label}
              </span>
              <span className={`rounded-full p-2 ${card.chip}`}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={card.icon} />
                </svg>
              </span>
            </div>
            <p className="mt-2 text-3xl font-bold text-gray-900">{card.value}</p>
            <p className="mt-1 text-xs text-gray-500">{card.hint}</p>
          </div>
        ))}

        {/* High / Urgent */}
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-700">
              High / Urgent
            </span>
            <span className="rounded-full bg-red-100 p-2 text-red-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-red-700">
            {stats.highPriorityActiveTasks}
          </p>
          <p className="mt-1 text-xs text-red-600">Open priority issues</p>
        </div>

        {/* Total Cost */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">
              Total Cost
            </span>
            <span className="rounded-full bg-gray-100 p-2 text-gray-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <p className="mt-2 text-xl font-bold text-gray-900">
            {formatCurrency(stats.totalMaintenanceCost)}
          </p>
          <p className="mt-1 text-xs text-gray-500">Across completed repairs</p>
        </div>
      </div>

      {/* My active tasks */}
      {(isMaintenance || isAdminOrManager) && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">My Active Repair Tasks</h2>
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
              <p className="text-sm text-gray-500 font-medium">No active tasks assigned to you</p>
              <p className="text-xs text-gray-400">Check with management for new assignments.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myActiveTasks.map((task) => {
                const status = STATUS_BADGE[task.status];
                return (
                  <div
                    key={task.taskId}
                    className="flex flex-col justify-between rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow bg-gray-50/50"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-bold text-gray-900">
                          {roomLabel(task.roomId)}
                        </h3>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${status.cls}`}>
                          {status.label}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5 text-xs text-gray-600">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Issue:</span>
                          <span className="font-medium text-gray-800">
                            {ISSUE_TYPE_LABEL[task.issueType] ?? task.issueType}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Priority:</span>
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${PRIORITY_BADGE[task.priority]}`}>
                            {task.priority}
                          </span>
                        </div>
                        <p className="pt-1 italic text-gray-700 bg-white p-2 rounded border border-gray-200">
                          "{task.description}"
                        </p>
                      </div>
                    </div>

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
                          onClick={() => setCompleteModalTask(task)}
                          className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                        >
                          Complete Task
                        </button>
                      )}
                      <Link
                        to={`/maintenance/tasks/${task.taskId}`}
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

      {/* Priority queue */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Priority Maintenance Queue</h2>
            <p className="text-xs text-gray-500">High and urgent issues still open</p>
          </div>
          <Link
            to="/maintenance/tasks"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            View all ({tasks.length}) →
          </Link>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-gray-500">Loading tasks…</div>
        ) : urgentQueue.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">
            No high or urgent issues outstanding.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Room</th>
                  <th className="px-4 py-3 text-left">Issue Type</th>
                  <th className="px-4 py-3 text-left">Priority</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {urgentQueue.map((task) => {
                  const status = STATUS_BADGE[task.status];
                  return (
                    <tr key={task.taskId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {roomLabel(task.roomId)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {ISSUE_TYPE_LABEL[task.issueType] ?? task.issueType}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded border px-2 py-0.5 text-xs font-semibold ${PRIORITY_BADGE[task.priority]}`}>
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
                        {formatDateTime(task.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/maintenance/tasks/${task.taskId}`}
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
    </div>
  );
}
