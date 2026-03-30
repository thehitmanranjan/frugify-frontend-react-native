import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useDate } from '../contexts/DateContext';
import { useLocalBudgets } from '../hooks/useBudgets';
import { useCombinedSummary } from '../hooks/useCombinedTransactions';
import { getQueryTimeFormat, getProRataBudget } from '../lib/date-utils';
import BudgetProgressBar from './BudgetProgressBar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCategories } from '../hooks/useCategories';

export default function DashboardBudgets() {
  const { theme } = useTheme();
  const { timeRange, startDate, endDate } = useDate();
  const { data: categories } = useCategories('expense');

  // Use the month from the selected date to fetch the relevant month's budget
  const month = startDate.getMonth() + 1;
  const year = startDate.getFullYear();

  const { data: budgets, isLoading: isBudgetsLoading } = useLocalBudgets(month, year);
  
  const startDateStr = getQueryTimeFormat(startDate);
  const endDateStr = getQueryTimeFormat(endDate);
  const { data: summary } = useCombinedSummary(timeRange, startDateStr, endDateStr);

  const monthStartStr = getQueryTimeFormat(new Date(year, month - 1, 1));
  const monthEndStr = getQueryTimeFormat(new Date(year, month, 0));
  const { data: monthlySummary } = useCombinedSummary('month', monthStartStr, monthEndStr);

  const { overallBudget, categoryBudgets } = useMemo(() => {
    if (!budgets) return { overallBudget: null, categoryBudgets: [] };
    const overall = budgets.find(b => b.categoryId === null) || null;
    const catBudgets = budgets.filter(b => b.categoryId !== null);
    
    // Sort category budgets by amount (highest first)
    catBudgets.sort((a, b) => b.amount - a.amount);
    
    const totalMonthExpense = monthlySummary?.expense || 0;
    const currentTimeframeExpense = summary?.expense || 0;
    const proRataOverall = overall ? { ...overall, amount: getProRataBudget(overall.amount, timeRange, startDate, totalMonthExpense, currentTimeframeExpense) } : null;

    return { overallBudget: proRataOverall, categoryBudgets: catBudgets };
  }, [budgets, timeRange, startDate, monthlySummary, summary]);

  if (isBudgetsLoading || !overallBudget) {
    return null; // Don't show if there is no overall budget
  }

  // Calculate spending per category
  const spendingByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    let totalExpense = 0;

    if (summary?.categoryData) {
      for (const cat of summary.categoryData) {
        if (cat.type === 'expense') {
          map[cat.id.toString()] = cat.amount;
          totalExpense += cat.amount;
        }
      }
    }
    map['overall'] = totalExpense;
    return map;
  }, [summary]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="target" size={20} color={theme.colors.primary} />
        <Text style={[styles.title, { color: theme.colors.text }]}>Budget Overview</Text>
      </View>

      {overallBudget && (
        <View style={styles.budgetItem}>
          <BudgetProgressBar
            label={timeRange === 'day' ? "Overall Daily Budget" : timeRange === 'week' ? "Overall Weekly Budget" : timeRange === 'year' ? "Overall Yearly Budget" : "Overall Monthly Budget"}
            spent={spendingByCategory['overall'] || 0}
            budget={overallBudget.amount}
            compact={true}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  budgetItem: {
    marginBottom: 8,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
});
