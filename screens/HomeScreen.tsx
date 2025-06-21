import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

import Header from '../components/Header';
import DateSelector from '../components/DateSelector';
import TimeRangeSelector from '../components/TimeRangeSelector';
import BudgetSummary from '../components/BudgetSummary';
import AddTransactionSheet from '../components/AddTransactionSheet';
import SpeechToTextSheet from '../components/SpeechToTextSheet';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSummary } from '../hooks/useTransactions';
import { useDate } from '../contexts/DateContext';
import { useTheme } from '../contexts/ThemeContext'; // Import useTheme
import { getQueryTimeFormat } from '../lib/date-utils';
import { formatTransactionDate } from '../lib/date-utils';
import { formatTransactionAmount } from '../lib/formatters';
import CategoryIcon from '../components/CategoryIcon';
import type { TransactionWithCategory } from '../hooks/useTransactions';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme(); // Use theme from context

  const [addTransactionVisible, setAddTransactionVisible] = useState(false);
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithCategory | null>(null);
  const [speechSheetVisible, setSpeechSheetVisible] = useState(false);

  const showAddTransaction = (type: 'expense' | 'income') => {
    setTransactionType(type);
    setSelectedTransaction(null);
    setAddTransactionVisible(true);
  };

  const showEditTransaction = (transaction: TransactionWithCategory) => {
    setTransactionType(transaction.category.type === 'income' ? 'income' : 'expense');
    setSelectedTransaction(transaction);
    setAddTransactionVisible(true);
  };

  // Transaction summary data
  const { timeRange, startDate, endDate } = useDate();
  const startDateStr = getQueryTimeFormat(startDate);
  const endDateStr = getQueryTimeFormat(endDate);
  const { data: summary, isLoading, isError, error } = useSummary(
    timeRange,
    startDateStr,
    endDateStr
  );

  // Header for FlatList
  const renderListHeader = () => (
    <>
      <DateSelector />
      <TimeRangeSelector />
      <BudgetSummary />
      <Text style={[styles.heading, { color: theme.colors.text }]}>Transactions</Text>
    </>
  );

  // Render each transaction
  const renderTransaction = ({ item }: { item: TransactionWithCategory }) => {
    if (!item.category) return null;
    return (
      <TouchableOpacity style={[styles.transactionCard, { backgroundColor: theme.colors.surface }]} onPress={() => showEditTransaction(item)}>
        <CategoryIcon
          name={item.category.icon}
          color={item.category.color} // Category color should contrast with surface
          size={18}
          style={styles.categoryIcon}
        />
        <View style={styles.transactionDetails}>
          <View style={styles.transactionHeader}>
            <Text style={[styles.categoryName, { color: theme.colors.text }]}>{item.category.name}</Text>
            <Text
              style={[
                styles.amount,
                // Theme-specific income/expense colors can be defined in ThemeContext if needed
                item.category.type === 'income' ? styles.incomeText : styles.expenseText,
                { color: item.category.type === 'income' ? (theme.isDarkMode ? '#4CAF50' : '#4CAF50') : (theme.isDarkMode ? '#F44336' : '#F44336')}
              ]}
            >
              {formatTransactionAmount(item.amount, item.category.type)}
            </Text>
          </View>
          <View style={styles.transactionFooter}>
            <Text style={[styles.description, { color: theme.colors.placeholder }]}>{item.description || item.category.name}</Text>
            <Text style={[styles.date, { color: theme.colors.placeholder }]}>{formatTransactionDate(item.date)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading transactions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (isError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header />
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={40} color={theme.isDarkMode ? "#F44336" : "#D32F2F"} />
          <Text style={[styles.errorText, { color: theme.isDarkMode ? "#F44336" : "#D32F2F" }]}>There was a problem loading your transactions.</Text>
          <Text style={[styles.errorSubText, { color: theme.colors.placeholder }]}>Please check your connection and try again.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Empty state
  if (!summary || !summary.transactions || summary.transactions.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header />
        <View style={[styles.content, { backgroundColor: theme.colors.background}]}>
          {renderListHeader()}
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="cash-remove" size={40} color={theme.colors.placeholder} />
            <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No transactions found for this period.</Text>
          </View>
        </View>
        {/* FAB menu for adding transactions - Assuming these buttons are themed correctly or don't need theming */}
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
            onPress={() => setSpeechSheetVisible(true)}
          >
            <MaterialCommunityIcons name="microphone" size={24} color="white" />
            <Text style={styles.actionButtonText}>Speech</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.incomeButton]}
            onPress={() => showAddTransaction('income')}
          >
            <MaterialCommunityIcons name="plus" size={24} color="white" />
            <Text style={styles.actionButtonText}>Income</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.expenseButton]}
            onPress={() => showAddTransaction('expense')}
          >
            <MaterialCommunityIcons name="minus" size={24} color="white" />
            <Text style={styles.actionButtonText}>Expense</Text>
          </TouchableOpacity>
        </View>
        <AddTransactionSheet
          isVisible={addTransactionVisible}
          transactionType={transactionType}
          onClose={() => setAddTransactionVisible(false)}
        />
        <SpeechToTextSheet
          isVisible={speechSheetVisible}
          onClose={() => setSpeechSheetVisible(false)}
        />
      </SafeAreaView>
    );
  }

  // Main list
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header />
      <View style={[styles.content, { backgroundColor: theme.colors.background }]}>
        <FlatList
          data={summary.transactions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTransaction}
          ListHeaderComponent={renderListHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      </View>
      {/* FAB menu for adding transactions */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
          onPress={() => setSpeechSheetVisible(true)}
        >
          <MaterialCommunityIcons name="microphone" size={24} color="white" />
          <Text style={styles.actionButtonText}>Speech</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.incomeButton]}
          onPress={() => showAddTransaction('income')}
        >
          <MaterialCommunityIcons name="plus" size={24} color="white" />
          <Text style={styles.actionButtonText}>Income</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.expenseButton]}
          onPress={() => showAddTransaction('expense')}
        >
          <MaterialCommunityIcons name="minus" size={24} color="white" />
          <Text style={styles.actionButtonText}>Expense</Text>
        </TouchableOpacity>
      </View>
      {/* Add Transaction Sheet */}
      <AddTransactionSheet
        isVisible={addTransactionVisible}
        transactionType={transactionType}
        onClose={() => setAddTransactionVisible(false)}
        transaction={selectedTransaction}
      />
      <SpeechToTextSheet
        isVisible={speechSheetVisible}
        onClose={() => setSpeechSheetVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { // Base container style, background color will be overridden by theme
    flex: 1,
  },
  content: { // Base content style, background color will be overridden by theme
    flex: 1,
    ...(Platform.OS === 'web' ? { height: '100%', overflow: 'hidden' } : {}),
  },
  fabContainer: { // FAB buttons might need specific theme adjustments if their current colors clash
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 20,
    flexDirection: 'row',
    justifyContent: 'center', // Center all buttons as a group
    alignItems: 'center',
    width: '100%', // Take full width for proper centering
    paddingHorizontal: 0,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10, // smaller padding
    paddingVertical: 7,   // smaller padding
    borderRadius: 20,     // smaller radius
    marginLeft: 0,
    marginRight: 8,         // smaller gap
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 2.84,
    elevation: 3,
    minWidth: 80,           // ensure all buttons have a minimum width
  },
  incomeButton: {
    backgroundColor: '#4CAF50',
  },
  expenseButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 13,           // smaller font
    marginLeft: 4,         // smaller gap
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 16,
    // color: '#333', // Theme controlled
  },
  transactionCard: { // Background color will be overridden by theme
    // backgroundColor: 'white', // Theme controlled
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  categoryIcon: {
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryName: { // Text color will be overridden by theme
    fontSize: 16,
    fontWeight: '500',
    // color: '#333', // Theme controlled
  },
  amount: { // Text color will be overridden by theme for income/expense
    fontSize: 16,
    fontWeight: '700',
  },
  incomeText: { // Specific color, might need theme adjustment if it clashes
    color: '#4CAF50',
  },
  expenseText: { // Specific color, might need theme adjustment if it clashes
    color: '#F44336',
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  description: { // Text color will be overridden by theme
    fontSize: 14,
    // color: '#666', // Theme controlled
  },
  date: { // Text color will be overridden by theme
    fontSize: 14,
    // color: '#999', // Theme controlled
  },
  loadingContainer: { // Background color will be overridden by theme
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { // Text color will be overridden by theme
    marginTop: 8,
    fontSize: 16,
    // color: '#666', // Theme controlled
  },
  errorContainer: { // Background color will be overridden by theme
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: { // Text color will be overridden by theme
    fontSize: 18,
    fontWeight: '500',
    // color: '#F44336', // Theme controlled
  },
  errorSubText: { // Text color will be overridden by theme
    fontSize: 14,
    // color: '#666', // Theme controlled
    textAlign: 'center',
    marginTop: 4,
  },
  emptyContainer: { // Background color will be overridden by theme
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: { // Text color will be overridden by theme
    fontSize: 16,
    // color: '#9E9E9E', // Theme controlled
    textAlign: 'center',
    marginTop: 8,
  },
  listContent: {
    paddingBottom: 100,
  },
});