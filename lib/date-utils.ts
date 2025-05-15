import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export type TimeRange = 'day' | 'week' | 'month' | 'year';

/**
 * Formats a transaction date for display in the UI
 */
export function formatTransactionDate(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return format(date, 'MMM d, yyyy');
}

/**
 * Converts a date to a string format for API queries
 */
export function getQueryTimeFormat(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Gets the start and end date for a given date and time range
 */
export function getDateRange(date: Date, range: TimeRange) {
  let startDate: Date;
  let endDate: Date;

  switch (range) {
    case 'day':
      startDate = startOfDay(date);
      endDate = endOfDay(date);
      break;
    case 'week':
      startDate = startOfWeek(date, { weekStartsOn: 1 }); // Week starts on Monday
      endDate = endOfWeek(date, { weekStartsOn: 1 });
      break;
    case 'month':
      startDate = startOfMonth(date);
      endDate = endOfMonth(date);
      break;
    case 'year':
      startDate = startOfYear(date);
      endDate = endOfYear(date);
      break;
    default:
      startDate = startOfMonth(date);
      endDate = endOfMonth(date);
  }

  return { startDate, endDate };
}

/**
 * Formats a date period for display in the UI
 */
export function formatDatePeriod(date: Date, range: TimeRange): string {
  switch (range) {
    case 'day':
      return format(date, 'MMMM d, yyyy');
    case 'week':
      const start = startOfWeek(date, { weekStartsOn: 1 });
      const end = endOfWeek(date, { weekStartsOn: 1 });
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
    case 'month':
      return format(date, 'MMMM yyyy');
    case 'year':
      return format(date, 'yyyy');
    default:
      return format(date, 'MMMM yyyy');
  }
}