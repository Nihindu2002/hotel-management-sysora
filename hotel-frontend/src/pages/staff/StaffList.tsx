import { useEffect, useMemo, useState } from 'react';
import { getAllStaff } from '../../services/staffService';
import type { EmploymentStatus, Staff, StaffDepartment } from '../../types/staff';

const DEPARTMENTS: StaffDepartment[] = [
  'FRONT_OFFICE',
  'HOUSEKEEPING',
  'MAINTENANCE',
  'RESTAURANT',
  'KITCHEN',
  'FINANCE',
  'MANAGEMENT',
  'IT',
  'SECURITY',
  'OTHER',
];

const STATUSES: EmploymentStatus[] = ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'];

function StatusBadge({ status }: { status: EmploymentStatus }) {
  const styles: Record<EmploymentStatus, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-800',
    INACTIVE: 'bg-gray-100 text-gray-700',
    ON_LEAVE: 'bg-amber-100 text-amber-800',
    TERMINATED: 'bg-red-100 text-red-800',
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        styles[status] ?? 'bg-gray-100 text-gray-700'
      }`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

/**
 * The employee roster.
 *
 * Distinct from Users, which holds the sign-in accounts: a staff record is the
 * employment relationship — department, position, hire date — and every record
 * is linked to exactly one account by uid.
 */
export default function StaffList() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [department, setDepartment] = useState<StaffDepartment | ''>('');
  const [status, setStatus] = useState<EmploymentStatus | ''>('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let ignore = false;

    getAllStaff()
      .then((data) => {
        if (!ignore) setStaff(data);
      })
      .catch((err: any) => {
        if (!ignore) {
          setError(err?.response?.data?.message || 'Failed to load staff.');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return staff.filter((member) => {
      if (department && member.department !== department) return false;
      if (status && member.employmentStatus !== status) return false;
      if (!search.trim()) return true;

      const query = search.toLowerCase();
      return (
        member.employeeId.toLowerCase().includes(query) ||
        member.position.toLowerCase().includes(query) ||
        member.userUid.toLowerCase().includes(query)
      );
    });
  }, [staff, department, status, search]);

  const activeCount = staff.filter((m) => m.employmentStatus === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Staff</h1>
          <p className="mt-1 text-sm text-gray-600">
            The employee roster. {activeCount} of {staff.length} active.
          </p>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search employee ID, position…"
          className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-royal focus:ring-2 focus:ring-royal/20 focus:outline-hidden sm:w-72"
        />
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value as StaffDepartment | '')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-2 focus:ring-royal/20 focus:outline-hidden"
        >
          <option value="">All departments</option>
          {DEPARTMENTS.map((value) => (
            <option key={value} value={value}>
              {value.replace('_', ' ')}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as EmploymentStatus | '')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal focus:ring-2 focus:ring-royal/20 focus:outline-hidden"
        >
          <option value="">All statuses</option>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {value.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Employee ID</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Hired</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    No staff match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((member) => (
                  <tr key={member.staffId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-gray-900">
                      {member.employeeId}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {member.department.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{member.position}</td>
                    <td className="px-4 py-3 text-gray-600">{member.hireDate}</td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={member.employmentStatus} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
