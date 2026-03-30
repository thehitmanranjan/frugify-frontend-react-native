import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

import Header from '../components/Header';
import DateSelector from '../components/DateSelector';
import TimeRangeSelector from '../components/TimeRangeSelector';
import BudgetSummary from '../components/BudgetSummary';
import DashboardBudgets from '../components/DashboardBudgets';
import AddTransactionSheet from '../components/AddTransactionSheet';
import SpeechToTextSheet from '../components/SpeechToTextSheet';
import SyncStatusIndicator from '../components/SyncStatusIndicator';
import TransactionSyncBadge from '../components/TransactionSyncBadge';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCombinedSummary } from '../hooks/useCombinedTransactions';
import { useDate } from '../contexts/DateContext';
import { useSearch } from '../contexts/SearchContext';
import { useTheme } from '../contexts/ThemeContext';
import { getQueryTimeFormat, getProRataBudget } from '../lib/date-utils';
import { formatTransactionDate } from '../lib/date-utils';
import { formatTransactionAmount } from '../lib/formatters';
import CategoryIcon from '../components/CategoryIcon';
import BudgetProgressBar from '../components/BudgetProgressBar';
import { useLocalBudgets } from '../hooks/useBudgets';
import type { TransactionWithCategory } from '../hooks/useTransactions';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme, isDarkMode } = useTheme(); // Get isDarkMode from context
  const { searchTarget, clearSearchTarget } = useSearch();
  const insets = useSafeAreaInsets();

  const [addTransactionVisible, setAddTransactionVisible] = useState(false);
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithCategory | null>(null);
  const [speechSheetVisible, setSpeechSheetVisible] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

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

  // Transaction summary data - combines server + pending local transactions
  const { timeRange, startDate, endDate } = useDate();
  const startDateStr = getQueryTimeFormat(startDate);
  const endDateStr = getQueryTimeFormat(endDate);
  const { data: summary, isLoading, isError, error } = useCombinedSummary(
    timeRange,
    startDateStr,
    endDateStr
  );
  
  const currentMonth = startDate.getMonth() + 1;
  const currentYear = startDate.getFullYear();
  const { data: budgets } = useLocalBudgets(currentMonth, currentYear);

  const monthStartStr = getQueryTimeFormat(new Date(currentYear, currentMonth - 1, 1));
  const monthEndStr = getQueryTimeFormat(new Date(currentYear, currentMonth, 0));
  const { data: monthlySummary } = useCombinedSummary('month', monthStartStr, monthEndStr);

  // Handle search target from Header search
  useEffect(() => {
    if (searchTarget && summary && summary.transactions) {
      const categoryIdStr = searchTarget.categoryId.toString();
      
      // Expand the category containing the searched transaction
      setExpandedCategories(prev => {
        if (!prev.includes(categoryIdStr)) {
          return [...prev, categoryIdStr];
        }
        return prev;
      });
      
      // Clear the search target after handling it
      setTimeout(() => {
        clearSearchTarget();
      }, 500);
    }
  }, [searchTarget, summary, clearSearchTarget]);

  // Header for FlatList
  const renderListHeader = () => (
    <>
      <DateSelector />
      <TimeRangeSelector />
      <BudgetSummary />
      <DashboardBudgets />
      <View style={styles.syncStatusContainer}>
        <Text style={[styles.heading, { color: theme.colors.text, flex: 1 }]}>Transactions</Text>
        <SyncStatusIndicator />
      </View>
    </>
  );

  // Group transactions by category id
  const groupedTransactions = React.useMemo(() => {
    if (!summary || !summary.transactions) return [];
    const groups: { [key: string]: { category: TransactionWithCategory['category'], transactions: TransactionWithCategory[] } } = {};
    summary.transactions.forEach((tx) => {
      if (!tx.category) return;
      const catId = tx.category.id.toString(); // Ensure string key
      if (!groups[catId]) {
        groups[catId] = { category: tx.category, transactions: [] };
      }
      groups[catId].transactions.push(tx);
    });

    const result = Object.values(groups);

    // Sort transactions within each category by amount (high to low)
    result.forEach(group => {
      group.transactions.sort((a, b) => Number(b.amount) - Number(a.amount));
    });

    // Sort categories by total amount (high to low)
    result.sort((a, b) => {
      const sumA = a.transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
      const sumB = b.transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
      return sumB - sumA;
    });

    return result;
  }, [summary]);

  // Choose card background color based on theme
  const cardBackgroundColor = isDarkMode ? '#1e1e1e' : (theme.colors.surface || '#fff');

  // Render a group summary row
  const renderCategoryGroup = ({ item }: { item: { category: TransactionWithCategory['category'], transactions: TransactionWithCategory[] } }) => {
    const catIdStr = item.category.id.toString();
    const isExpanded = expandedCategories.includes(catIdStr);
    const total = item.transactions.reduce((sum, tx) => {
      const amt = Number(tx.amount);
      return sum + (!isNaN(amt) ? amt : 0);
    }, 0);
    const handleToggleExpand = () => {
      setExpandedCategories((prev) =>
        prev.includes(catIdStr)
          ? prev.filter((id) => id !== catIdStr)
          : [...prev, catIdStr]
      );
    };

    const categoryBudget = budgets?.find((b) => b.categoryId === item.category.id);
    
    let categoryMonthlySpend = 0;
    if (monthlySummary?.categoryData) {
      const catData = monthlySummary.categoryData.find((c) => c.id === item.category.id);
      if (catData) categoryMonthlySpend = catData.amount;
    }

    const proRataCategoryBudgetAmount = categoryBudget 
      ? getProRataBudget(categoryBudget.amount, timeRange, startDate, categoryMonthlySpend, total) 
      : null;
    const isOverBudget = proRataCategoryBudgetAmount !== null && total > proRataCategoryBudgetAmount;

    return (
      <View>
        <TouchableOpacity
          style={[styles.transactionCard, { backgroundColor: cardBackgroundColor, flexDirection: 'row', alignItems: 'center' }]}
          onPress={handleToggleExpand}
        >
          <CategoryIcon
            name={item.category.icon}
            color={item.category.color}
            size={20}
            style={styles.categoryIcon}
          />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.categoryName, { color: theme.colors.text }]} numberOfLines={1}>
                {item.category.name}
              </Text>
              {isOverBudget && (
                <MaterialCommunityIcons name="alert" size={16} color="#F44336" style={{ marginLeft: 6 }} />
              )}
            </View>
            <Text style={{ color: theme.colors.placeholder, fontSize: 12 }}>{item.transactions.length} transaction{item.transactions.length > 1 ? 's' : ''}</Text>
          </View>
          <Text
            style={[
              styles.amount,
              item.category.type === 'income' ? styles.incomeText : styles.expenseText,
              { color: item.category.type === 'income' ? '#4CAF50' : '#F44336' }
            ]}
          >
            {formatTransactionAmount(total, item.category.type)}
          </Text>
          <MaterialCommunityIcons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={24} color={theme.colors.placeholder} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
        {isExpanded && (
          <View style={{ marginLeft: 24, marginTop: 4, marginBottom: 8 }}>
            {proRataCategoryBudgetAmount !== null && (
              <View style={{ marginBottom: 12, marginRight: 16 }}>
                 <BudgetProgressBar
                   label={`${item.category.name} Budget`}
                   spent={total}
                   budget={proRataCategoryBudgetAmount}
                   color={item.category.color}
                   compact={true}
                 />
              </View>
            )}
            {item.transactions.map((tx) => {
              const isSearchedTransaction = searchTarget && searchTarget.transactionId === tx.id;
              return (
                <TouchableOpacity
                  key={tx.id}
                  style={[
                    styles.transactionCard, 
                    { 
                      backgroundColor: isSearchedTransaction 
                        ? (isDarkMode ? '#2a4a2a' : '#e8f5e8') 
                        : cardBackgroundColor, 
                      marginHorizontal: 0, 
                      marginBottom: 8, 
                      padding: 10,
                      borderWidth: isSearchedTransaction ? 2 : 0,
                      borderColor: isSearchedTransaction ? '#4CAF50' : 'transparent',
                    }
                  ]}
                  onPress={() => showEditTransaction(tx)}
                >
                  <View style={styles.transactionDetails}>
                    <View style={styles.transactionHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <Text style={[styles.description, { color: theme.colors.text, flex: 1 }]}>
                          {tx.description || tx.category.name}
                        </Text>
                        {(tx as any)._syncStatus && (
                          <TransactionSyncBadge syncStatus={(tx as any)._syncStatus} size={14} />
                        )}
                      </View>
                      <Text style={[
                        styles.amount,
                        tx.category.type === 'income' ? styles.incomeText : styles.expenseText,
                        { color: tx.category.type === 'income' ? '#4CAF50' : '#F44336', fontSize: 15 }
                      ]}>
                        {formatTransactionAmount(tx.amount, tx.category.type)}
                      </Text>
                    </View>
                    <View style={styles.transactionFooter}>
                      <Text style={[styles.date, { color: theme.colors.placeholder }]}>{formatTransactionDate(tx.date)}</Text>
                      {isSearchedTransaction && (
                        <Text style={[styles.searchHighlight, { color: '#4CAF50' }]}>• Found</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
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
          <MaterialCommunityIcons name="alert-circle" size={40} color="#F44336" />
          <Text style={[styles.errorText, { color: "#F44336" }]}>There was a problem loading your transactions.</Text>
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
        <View style={[styles.fabContainer, { bottom: insets.bottom + 20 }]}>
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
          data={groupedTransactions}
          keyExtractor={(item) => item.category.id.toString()}
          renderItem={renderCategoryGroup}
          ListHeaderComponent={renderListHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      </View>
      {/* FAB menu for adding transactions */}
      <View style={[styles.fabContainer, { bottom: insets.bottom + 20 }]}>
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
    backgroundColor: '#F44336',
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
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  syncStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  categoryHeader: {
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 16,
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
  searchHighlight: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
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