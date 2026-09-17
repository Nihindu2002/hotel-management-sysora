import { RANGE_PRESETS } from '../../../utils/dateRange';
import type { ReportRangeState } from '../useReportRange';

interface DateRangeFilterProps {
  state: ReportRangeState;
  /** Shown next to the controls, e.g. "Sep 1 – Sep 30, 2026". */
  summary?: string;
}

export default function DateRangeFilter({ state, summary }: DateRangeFilterProps) {
  const { preset, custom, selectPreset, setCustomStart, setCustomEnd } = state;

  const invalidRange = Boolean(
    custom.startDate && custom.endDate && custom.startDate > custom.endDate
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-2">
          {RANGE_PRESETS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => selectPreset(option.value)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                preset === option.value
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {preset === 'CUSTOM' && (
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                From
              </label>
              <input
                type="date"
                value={custom.startDate}
                onChange={(event) => setCustomStart(event.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                To
              </label>
              <input
                type="date"
                value={custom.endDate}
                onChange={(event) => setCustomEnd(event.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {summary && (
          <p className="ml-auto text-xs font-medium text-gray-500">{summary}</p>
        )}
      </div>

      {invalidRange && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          The "From" date is after the "To" date. Choose a valid range.
        </p>
      )}

      {preset === 'CUSTOM' && (!custom.startDate || !custom.endDate) && (
        <p className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
          Pick both dates to load the report.
        </p>
      )}
    </div>
  );
}
