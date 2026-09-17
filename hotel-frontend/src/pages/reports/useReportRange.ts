import { useMemo, useState } from 'react';
import type { DateRange } from '../../types/dashboard';
import { resolvePreset, type RangePreset } from '../../utils/dateRange';

export interface ReportRangeState {
  preset: RangePreset;
  range: DateRange;
  custom: DateRange;
  selectPreset: (preset: RangePreset) => void;
  setCustomStart: (value: string) => void;
  setCustomEnd: (value: string) => void;
}

/**
 * Owns the report date range. Each report page feeds `range` straight into its
 * service calls, so the selected window is always resolved on the server.
 *
 * The range is derived during render rather than synced by an effect, so
 * switching preset triggers exactly one refetch.
 */
export function useReportRange(initialPreset: RangePreset = 'THIS_MONTH'): ReportRangeState {
  const [preset, setPreset] = useState<RangePreset>(initialPreset);
  const [custom, setCustom] = useState<DateRange>({ startDate: '', endDate: '' });

  const range = useMemo(() => resolvePreset(preset, custom), [preset, custom]);

  const selectPreset = (next: RangePreset) => {
    setPreset(next);
    if (next === 'CUSTOM') {
      // Seed the inputs with the window that was just on screen so the user
      // starts from something rather than two blank fields.
      setCustom((previous) =>
        previous.startDate && previous.endDate ? previous : range
      );
    }
  };

  return {
    preset,
    range,
    custom,
    selectPreset,
    setCustomStart: (startDate) => setCustom((previous) => ({ ...previous, startDate })),
    setCustomEnd: (endDate) => setCustom((previous) => ({ ...previous, endDate })),
  };
}
