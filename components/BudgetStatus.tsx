import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Card, ProgressBar } from 'react-native-paper';
import { useTheme } from '../contexts/ThemeContext';
import { formatCurrency } from '../lib/formatters';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App'; // Ensure this path is correct

interface BudgetStatusProps {
  totalBudget: number;
  totalSpent: number;
}

type NavigationProp = StackNavigationProp<RootStackParamList, 'Home'>; // Adjust screen name if needed

export default function BudgetStatus({ totalBudget, totalSpent }: BudgetStatusProps) {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const remaining = totalBudget - totalSpent;
  const progress = totalBudget > 0 ? totalSpent / totalBudget : 0;
  const isOverBudget = totalSpent > totalBudget;

  const progressBarColor = isOverBudget
    ? (theme.isDarkMode ? '#CF6679' : '#B00020')
    : (theme.isDarkMode ? '#03DAC5' : '#4CAF50');

  const handlePress = () => {
    navigation.navigate('Budget'); // Navigate to BudgetScreen
  };

  return (
    <Card
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      onPress={handlePress}
    >
      <Text style={[styles.title, { color: theme.colors.text }]}>Monthly Budget Status</Text>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={[styles.label, { color: theme.colors.placeholder }]}>Total Budget</Text>
          <Text style={[styles.value, { color: theme.colors.text }]}>{formatCurrency(totalBudget)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.label, { color: theme.colors.placeholder }]}>Spent</Text>
          <Text style={[styles.value, { color: isOverBudget ? progressBarColor : theme.colors.text }]}>
            {formatCurrency(totalSpent)}
          </Text>
        </View>
        <View style={[styles.summaryItem, { alignItems: 'flex-end' }]}>
          <Text style={[styles.label, { color: theme.colors.placeholder }]}>Remaining</Text>
          <Text style={[styles.value, { color: isOverBudget ? progressBarColor : (theme.isDarkMode ? '#03DAC5' : '#4CAF50') }]}>
            {formatCurrency(remaining)}
          </Text>
        </View>
      </View>

      <ProgressBar
        progress={Math.min(progress, 1)}
        color={progressBarColor}
        style={styles.progressBar}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryItem: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
});
