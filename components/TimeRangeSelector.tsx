import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TimeRange } from '../lib/date-utils';
import { useDate } from '../contexts/DateContext';
import { useTheme } from '../contexts/ThemeContext'; // Import useTheme

interface TimeRangeSelectorProps {
  style?: any;
}

export default function TimeRangeSelector({ style }: TimeRangeSelectorProps) {
  const { timeRange, setTimeRange } = useDate();
  const { theme } = useTheme(); // Use theme from context

  const ranges: { key: TimeRange; label: string }[] = [
    { key: "day", label: "Day" },
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
    { key: "year", label: "Year" },
  ];

  return (
    <View style={[styles.container, style, { borderBottomColor: theme.colors.placeholder, backgroundColor: theme.colors.surface }]}>
      {ranges.map((range) => (
        <TouchableOpacity
          key={range.key}
          style={[
            styles.rangeButton,
            timeRange === range.key && styles.activeRangeButton,
            timeRange === range.key && { borderBottomColor: theme.colors.primary }
          ]}
          onPress={() => setTimeRange(range.key)}
        >
          <Text 
            style={[
              styles.rangeText,
              { color: theme.colors.placeholder },
              timeRange === range.key && styles.activeRangeText,
              timeRange === range.key && { color: theme.colors.primary }
            ]}
          >
            {range.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { // Base container style, background and border color will be overridden by theme
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  rangeButton: { // Base button style
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeRangeButton: { // Border color will be overridden by theme
    borderBottomWidth: 2,
  },
  rangeText: { // Text color will be overridden by theme
    fontSize: 14,
  },
  activeRangeText: { // Text color will be overridden by theme
    fontWeight: '500',
  }
});