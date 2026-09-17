import { Link } from 'react-router-dom';

interface ReportLink {
  title: string;
  path: string;
  description: string;
  icon: string;
  chip: string;
}

const REPORTS: ReportLink[] = [
  {
    title: 'Revenue Report',
    path: '/reports/revenue',
    description:
      'Daily and monthly revenue trends, revenue split by category, and the total for any date range.',
    icon: 'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941',
    chip: 'bg-emerald-50 text-emerald-600',
  },
  {
    title: 'Occupancy Report',
    path: '/reports/occupancy',
    description:
      'Current room availability and the occupancy rate across the property, by room status.',
    icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75',
    chip: 'bg-indigo-50 text-indigo-600',
  },
  {
    title: 'Expense Report',
    path: '/reports/expenses',
    description:
      'Total spending, the expense trend over time, and where the money went by category.',
    icon: 'M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181',
    chip: 'bg-red-50 text-red-600',
  },
];

export default function ReportsOverview() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="mt-1 text-sm text-gray-600">
            Financial and occupancy reporting. Every figure is calculated by the
            backend for the date range you choose.
          </p>
        </div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {REPORTS.map((report) => (
          <Link
            key={report.path}
            to={report.path}
            className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
          >
            <span className={`inline-block rounded-full p-3 ${report.chip}`}>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d={report.icon} />
              </svg>
            </span>

            <h2 className="mt-4 text-lg font-bold text-gray-900 group-hover:text-indigo-700">
              {report.title}
            </h2>
            <p className="mt-1 text-sm text-gray-600">{report.description}</p>

            <span className="mt-4 inline-block text-sm font-semibold text-indigo-600">
              Open report →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
