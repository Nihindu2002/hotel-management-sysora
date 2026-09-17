import type { DateRange } from '../types/dashboard';

export type RangePreset = 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM';

export const RANGE_PRESETS: { value: RangePreset; label: string }[] = [
  { value: 'TODAY', label: 'Today' },
  { value: 'THIS_WEEK', label: 'This Week' },
  { value: 'THIS_MONTH', label: 'This Month' },
  { value: 'CUSTOM', label: 'Custom Range' },
];

/**
 * Builds `YYYY-MM-DD` from local parts. `toISOString()` would convert to UTC
 * first and can land on the previous or next day depending on the offset, which
 * would shift every report range by one day.
 */
export const toIsoDate = (date: Date): string => {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const todayRange = (): DateRange => {
  const today = toIsoDate(new Date());
  return { startDate: today, endDate: today };
};

/** Monday to Sunday of the current week. */
export const thisWeekRange = (): DateRange => {
  const now = startOfDay(new Date());
  // getDay() is Sunday-first; shift so Monday is 0.
  const offsetToMonday = (now.getDay() + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offsetToMonday);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

  return { startDate: toIsoDate(monday), endDate: toIsoDate(sunday) };
};

export const thisMonthRange = (): DateRange => {
  const now = new Date();
  return {
    startDate: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    // Day 0 of next month is the last day of this one.
    endDate: toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
};

export const currentMonthLabel = (): string =>
  new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

/** Resolves a preset to concrete bounds; CUSTOM returns the caller's dates. */
export const resolvePreset = (
  preset: RangePreset,
  custom?: Partial<DateRange>
): DateRange => {
  switch (preset) {
    case 'TODAY':
      return todayRange();
    case 'THIS_WEEK':
      return thisWeekRange();
    case 'THIS_MONTH':
      return thisMonthRange();
    default:
      return {
        startDate: custom?.startDate ?? '',
        endDate: custom?.endDate ?? '',
      };
  }
};

export const formatRangeLabel = (range: DateRange): string => {
  if (!range.startDate || !range.endDate) return 'All time';

  const format = (value: string) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    const date = match
      ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      : new Date(value);

    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (range.startDate === range.endDate) return format(range.startDate);
  return `${format(range.startDate)} – ${format(range.endDate)}`;
};
