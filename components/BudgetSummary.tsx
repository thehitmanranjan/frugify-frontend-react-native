import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSummary } from '../hooks/useTransactions';
import { useDate } from '../contexts/DateContext';
import { getQueryTimeFormat } from '../lib/date-utils';
import { formatCurrency } from '../lib/formatters';

export default function BudgetSummary() {
  const { timeRange, startDate, endDate } = useDate();
  const startDateStr = getQueryTimeFormat(startDate);
  const endDateStr = getQueryTimeFormat(endDate);
  
  const { data: summary, isLoading, isError, error } = useSummary(
    timeRange,
    startDateStr,
    endDateStr
  );
  
  // Log request for debugging
  console.log(`Fetching summary data for ${timeRange} from ${startDateStr} to ${endDateStr}`);

  const screenWidth = Dimensions.get('window').width;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading summary...</Text>
      </View>
    );
  }
  
  if (isError) {
    console.error('Error loading budget summary:', error);
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={40} color="#F44336" />
          <Text style={styles.errorText}>
            There was a problem loading your data.
          </Text>
          <Text style={styles.errorSubText}>
            Please check your connection and try again.
          </Text>
        </View>
      </View>
    );
  }

  if (!summary || !summary.categoryData || summary.categoryData.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.balanceLabel}>Balance</Text>
          <Text style={styles.balanceValue}>{formatCurrency(0)}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Income</Text>
              <Text style={[styles.summaryValue, styles.incomeText]}>
                {formatCurrency(0)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Expense</Text>
              <Text style={[styles.summaryValue, styles.expenseText]}>
                {formatCurrency(0)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Filter out expense categories for the chart
  const expenseCategories = summary.categoryData.filter(
    (cat) => cat.type === "expense" && cat.amount > 0
  );

  // Only show the chart if there are expense categories
  const showChart = expenseCategories.length > 0;

  // Prepare data for the pie chart
  const chartData = expenseCategories.map((category) => ({
    name: category.name,
    amount: category.amount,
    color: category.color,
    legendFontColor: '#7F7F7F',
    legendFontSize: 12
  }));

  return (
    <View style={styles.container}>
      {showChart ? (
        <PieChart
          data={chartData}
          width={screenWidth}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          }}
          accessor="amount"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute={false}
          hasLegend={false}
        />
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No expense data for this period</Text>
        </View>
      )}

      <View style={styles.centerContent}>
        <Text style={styles.balanceLabel}>Balance</Text>
        <Text style={styles.balanceValue}>{formatCurrency(summary.balance)}</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={[styles.summaryValue, styles.incomeText]}>
              {formatCurrency(summary.income)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Expense</Text>
            <Text style={[styles.summaryValue, styles.expenseText]}>
              {formatCurrency(summary.expense)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    backgroundColor: 'white',
    position: 'relative',
    minHeight: 220,
  },
  loadingContainer: {
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  errorText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 12,
  },
  errorSubText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  centerContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
  },
  balanceValue: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
  },
  summaryItem: {
    alignItems: 'center',
    marginHorizontal: 12,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  incomeText: {
    color: '#4CAF50',
  },
  expenseText: {
    color: '#F44336',
  },
  noDataContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    color: '#666',
    fontSize: 16,
  }
});