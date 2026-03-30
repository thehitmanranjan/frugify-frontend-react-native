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

/**
 * Calculates a pro-rata budget limit out of a monthly budget based on the selected time range
 */
export function getProRataBudget(
  monthlyBudget: number,
  timeRange: string,
  date: Date,
  totalMonthExpense?: number,
  currentTimeframeExpense?: number
): number {
  if (timeRange === 'month') return monthlyBudget;
  if (timeRange === 'year' || timeRange === 'all') return monthlyBudget * 12;

  // Smart advanced pro-rata constraint using historical expense data
  if (totalMonthExpense !== undefined && currentTimeframeExpense !== undefined) {
    const year = date.getFullYear();
    const monthIndex = date.getMonth();
    const dateOfStart = date.getDate();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    
    const expenseBeforeTimeframe = Math.max(0, totalMonthExpense - currentTimeframeExpense);
    const remainingBudgetBeforeTimeframe = Math.max(0, monthlyBudget - expenseBeforeTimeframe);
    const remainingDays = Math.max(1, daysInMonth - dateOfStart + 1);

    const smartDailyBudget = remainingBudgetBeforeTimeframe / remainingDays;

    if (timeRange === 'day') {
      return smartDailyBudget;
    }
    if (timeRange === 'week') {
      return Math.min(remainingBudgetBeforeTimeframe, smartDailyBudget * 7);
    }
  }

  // Simple unconstrained pro-rata fallback
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const dailyBudget = monthlyBudget / daysInMonth;

  if (timeRange === 'day') return dailyBudget;
  if (timeRange === 'week') return dailyBudget * 7;

  return monthlyBudget;
}