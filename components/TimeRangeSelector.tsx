import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TimeRange } from '../lib/date-utils';
import { useDate } from '../contexts/DateContext';

interface TimeRangeSelectorProps {
  style?: any;
}

export default function TimeRangeSelector({ style }: TimeRangeSelectorProps) {
  const { timeRange, setTimeRange } = useDate();

  const ranges: { key: TimeRange; label: string }[] = [
    { key: "day", label: "Day" },
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
    { key: "year", label: "Year" },
  ];

  return (
    <View style={[styles.container, style]}>
      {ranges.map((range) => (
        <TouchableOpacity
          key={range.key}
          style={[
            styles.rangeButton,
            timeRange === range.key && styles.activeRangeButton
          ]}
          onPress={() => setTimeRange(range.key)}
        >
          <Text 
            style={[
              styles.rangeText,
              timeRange === range.key && styles.activeRangeText
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
  container: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: 'white',
  },
  rangeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeRangeButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3',
  },
  rangeText: {
    color: '#666',
    fontSize: 14,
  },
  activeRangeText: {
    color: '#2196F3',
    fontWeight: '500',
  }
});