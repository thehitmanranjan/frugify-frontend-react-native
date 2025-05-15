import React, { createContext, useContext, useState, ReactNode } from 'react';
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, addYears, subYears } from 'date-fns';
import { getDateRange, formatDatePeriod } from '../lib/date-utils';

export type TimeRange = 'day' | 'week' | 'month' | 'year';

interface DateContextType {
  currentDate: Date;
  timeRange: TimeRange;
  startDate: Date;
  endDate: Date;
  formattedPeriod: string;
  setTimeRange: (range: TimeRange) => void;
  goToPreviousPeriod: () => void;
  goToNextPeriod: () => void;
  resetToToday: () => void;
}

// Create context with default values
const DateContext = createContext<DateContextType>({
  currentDate: new Date(),
  timeRange: 'month',
  startDate: new Date(),
  endDate: new Date(),
  formattedPeriod: '',
  setTimeRange: () => {},
  goToPreviousPeriod: () => {},
  goToNextPeriod: () => {},
  resetToToday: () => {},
});

export function DateProvider({ children }: { children: ReactNode }) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [timeRange, setTimeRange] = useState<TimeRange>('month');

  // Calculate start and end dates based on current date and time range
  const { startDate, endDate } = getDateRange(currentDate, timeRange);
  
  // Format the period for display
  const formattedPeriod = formatDatePeriod(currentDate, timeRange);

  // Navigate to previous period
  const goToPreviousPeriod = () => {
    switch (timeRange) {
      case 'day':
        setCurrentDate(subDays(currentDate, 1));
        break;
      case 'week':
        setCurrentDate(subWeeks(currentDate, 1));
        break;
      case 'month':
        setCurrentDate(subMonths(currentDate, 1));
        break;
      case 'year':
        setCurrentDate(subYears(currentDate, 1));
        break;
    }
  };

  // Navigate to next period
  const goToNextPeriod = () => {
    switch (timeRange) {
      case 'day':
        setCurrentDate(addDays(currentDate, 1));
        break;
      case 'week':
        setCurrentDate(addWeeks(currentDate, 1));
        break;
      case 'month':
        setCurrentDate(addMonths(currentDate, 1));
        break;
      case 'year':
        setCurrentDate(addYears(currentDate, 1));
        break;
    }
  };

  // Reset to today
  const resetToToday = () => {
    setCurrentDate(new Date());
  };

  // Handle time range change
  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
  };

  return (
    <DateContext.Provider
      value={{
        currentDate,
        timeRange,
        startDate,
        endDate,
        formattedPeriod,
        setTimeRange: handleTimeRangeChange,
        goToPreviousPeriod,
        goToNextPeriod,
        resetToToday,
      }}
    >
      {children}
    </DateContext.Provider>
  );
}

// Custom hook to use the DateContext
export function useDate() {
  const context = useContext(DateContext);
  if (context === undefined) {
    throw new Error('useDate must be used within a DateProvider');
  }
  return context;
}