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
import { getQueryTimeFormat } from '../lib/date-utils';
import { formatTransactionDate } from '../lib/date-utils';
import { formatTransactionAmount } from '../lib/formatters';
import CategoryIcon from '../components/CategoryIcon';
import type { TransactionWithCategory } from '../hooks/useTransactions';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();

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
      <Text style={styles.heading}>Transactions</Text>
    </>
  );

  // Render each transaction
  const renderTransaction = ({ item }: { item: TransactionWithCategory }) => {
    if (!item.category) return null;
    return (
      <TouchableOpacity style={styles.transactionCard} onPress={() => showEditTransaction(item)}>
        <CategoryIcon
          name={item.category.icon}
          color={item.category.color}
          size={18}
          style={styles.categoryIcon}
        />
        <View style={styles.transactionDetails}>
          <View style={styles.transactionHeader}>
            <Text style={styles.categoryName}>{item.category.name}</Text>
            <Text
              style={[
                styles.amount,
                item.category.type === 'income' ? styles.incomeText : styles.expenseText,
              ]}
            >
              {formatTransactionAmount(item.amount, item.category.type)}
            </Text>
          </View>
          <View style={styles.transactionFooter}>
            <Text style={styles.description}>{item.description || item.category.name}</Text>
            <Text style={styles.date}>{formatTransactionDate(item.date)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (isError) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={40} color="#F44336" />
          <Text style={styles.errorText}>There was a problem loading your transactions.</Text>
          <Text style={styles.errorSubText}>Please check your connection and try again.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Empty state
  if (!summary || !summary.transactions || summary.transactions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.content}>
          {renderListHeader()}
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="cash-remove" size={40} color="#9E9E9E" />
            <Text style={styles.emptyText}>No transactions found for this period.</Text>
          </View>
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
    <SafeAreaView style={styles.container}>
      <Header />
      <View style={styles.content}>
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
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    ...(Platform.OS === 'web' ? { height: '100%', overflow: 'hidden' } : {}),
  },
  fabContainer: {
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
    color: '#333',
  },
  transactionCard: {
    backgroundColor: 'white',
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
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
  incomeText: {
    color: '#4CAF50',
  },
  expenseText: {
    color: '#F44336',
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666',
  },
  date: {
    fontSize: 14,
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#F44336',
  },
  errorSubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#9E9E9E',
    textAlign: 'center',
    marginTop: 8,
  },
  listContent: {
    paddingBottom: 100,
  },
});