import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { formatCurrency } from '../lib/formatters';

interface BudgetProgressBarProps {
  label: string;
  spent: number;
  budget: number;
  color?: string;
  icon?: string;
  compact?: boolean;
}

export default function BudgetProgressBar({
  label,
  spent,
  budget,
  color,
  compact = false,
}: BudgetProgressBarProps) {
  const { theme, isDarkMode } = useTheme();

  const rawProgress = budget > 0 ? spent / budget : 0;
  const progress = Math.min(rawProgress, 1);
  const isOverBudget = spent > budget;
  const remaining = budget - spent;

  // Color logic
  const defaultGreen = isDarkMode ? '#03DAC5' : '#4CAF50';
  const warningColor = '#FF9800';
  const dangerColor = theme.colors.error || (isDarkMode ? '#CF6679' : '#F44336');

  let barColor = color || defaultGreen;
  if (rawProgress >= 1) barColor = dangerColor;
  else if (rawProgress >= 0.9) barColor = warningColor;

  const trackColor = isDarkMode ? '#2a2a2a' : '#f0f0f0';

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactHeader}>
          <Text style={[styles.compactLabel, { color: theme.colors.text }]} numberOfLines={1}>
            {label}
          </Text>
          <Text style={[styles.compactAmount, { color: isOverBudget ? dangerColor : theme.colors.placeholder }]}>
            {formatCurrency(spent)} / {formatCurrency(budget)}
          </Text>
        </View>
        <View style={[styles.progressTrack, styles.compactTrack, { backgroundColor: trackColor }]}>
          <View
            style={[
              styles.progressFill,
              styles.compactTrack,
              { width: `${progress * 100}%`, backgroundColor: barColor },
            ]}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: theme.colors.text }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.percentage, { color: barColor }]}>
          {Math.round(progress * 100)}%
        </Text>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: trackColor }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${progress * 100}%`, backgroundColor: barColor },
          ]}
        />
      </View>

      <View style={styles.footer}>
        <Text style={[styles.spent, { color: theme.colors.placeholder }]}>
          Spent: <Text style={{ color: isOverBudget ? dangerColor : theme.colors.text, fontWeight: '600' }}>
            {formatCurrency(spent)}
          </Text>
        </Text>
        <Text style={[styles.remaining, { color: isOverBudget ? dangerColor : defaultGreen }]}>
          {isOverBudget
            ? `⚠️ Over budget by ${formatCurrency(Math.abs(remaining))}`
            : `${formatCurrency(remaining)} left`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  percentage: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  spent: {
    fontSize: 13,
  },
  remaining: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Compact styles
  compactContainer: {
    marginBottom: 10,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  compactLabel: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  compactAmount: {
    fontSize: 12,
    marginLeft: 8,
  },
  compactTrack: {
    height: 6,
    borderRadius: 3,
  },
});
