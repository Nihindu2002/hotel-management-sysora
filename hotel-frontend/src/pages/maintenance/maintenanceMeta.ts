import type {
  MaintenanceIssueType,
  MaintenancePriority,
  MaintenanceStatus,
} from '../../types/maintenance';

export const STATUS_BADGE: Record<
  MaintenanceStatus,
  { label: string; cls: string; dot: string }
> = {
  PENDING: { label: 'Pending', cls: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  ASSIGNED: { label: 'Assigned', cls: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500' },
  IN_PROGRESS: { label: 'In Progress', cls: 'bg-purple-100 text-purple-800 border-purple-200', dot: 'bg-purple-500' },
  COMPLETED: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400' },
};

export const PRIORITY_BADGE: Record<MaintenancePriority, string> = {
  LOW: 'bg-slate-100 text-slate-700 border-slate-200',
  MEDIUM: 'bg-blue-100 text-blue-700 border-blue-200',
  HIGH: 'bg-amber-100 text-amber-800 border-amber-200',
  URGENT: 'bg-red-100 text-red-800 border-red-200 animate-pulse',
};

export const ISSUE_TYPE_LABEL: Record<MaintenanceIssueType, string> = {
  ELECTRICAL: 'Electrical',
  PLUMBING: 'Plumbing',
  AIR_CONDITIONING: 'Air Conditioning',
  FURNITURE: 'Furniture',
  APPLIANCE: 'Appliance',
  NETWORK: 'Network',
  STRUCTURAL: 'Structural',
  OTHER: 'Other',
};

export const ISSUE_TYPES: MaintenanceIssueType[] = [
  'ELECTRICAL',
  'PLUMBING',
  'AIR_CONDITIONING',
  'FURNITURE',
  'APPLIANCE',
  'NETWORK',
  'STRUCTURAL',
  'OTHER',
];

export const PRIORITIES: MaintenancePriority[] = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
];

export const STATUSES: MaintenanceStatus[] = [
  'PENDING',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
];

export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '—';
  return `LKR ${amount.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatDateTime = (value?: string | null): string => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
