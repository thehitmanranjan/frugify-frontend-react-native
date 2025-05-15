import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatTransactionDate } from '../lib/date-utils';
import { formatTransactionAmount } from '../lib/formatters';
import { useSummary } from '../hooks/useTransactions';
import { useDate } from '../contexts/DateContext';
import { getQueryTimeFormat } from '../lib/date-utils';
import CategoryIcon from './CategoryIcon';

export default function TransactionsList() {
  const { timeRange, startDate, endDate } = useDate();
  const startDateStr = getQueryTimeFormat(startDate);
  const endDateStr = getQueryTimeFormat(endDate);

  const { data: summary, isLoading, isError, error } = useSummary(
    timeRange,
    startDateStr,
    endDateStr
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  if (isError) {
    console.error('Error loading transactions:', error);
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Transactions</Text>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={40} color="#F44336" />
          <Text style={styles.errorText}>
            There was a problem loading your transactions.
          </Text>
          <Text style={styles.errorSubText}>
            Please check your connection and try again.
          </Text>
        </View>
      </View>
    );
  }

  if (!summary || !summary.transactions || summary.transactions.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Transactions</Text>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="cash-remove" size={40} color="#9E9E9E" />
          <Text style={styles.emptyText}>No transactions found for this period.</Text>
        </View>
      </View>
    );
  }

  // Log summary data for debugging
  console.log('Summary data available:', {
    income: summary.income,
    expense: summary.expense,
    transactionsCount: summary.transactions.length,
    categories: summary.categoryData?.length
  });

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Transactions</Text>
      
      {/* Use a wrapper to ensure proper scrolling on web */}
      <View style={styles.listWrapper}>
        <FlatList  
          data={summary.transactions}  
          keyExtractor={(item) => item.id.toString()}  
          renderItem={({ item }) => {  
            // Ensure category exists  
            if (!item.category) {  
              console.warn('Transaction without category:', item.id);  
              return null;  
            }  
              
            return (  
              <TouchableOpacity style={styles.transactionCard}>  
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
                        item.category.type === "income" ? styles.incomeText : styles.expenseText  
                      ]}  
                    >  
                      {formatTransactionAmount(item.amount, item.category.type)}  
                    </Text>  
                  </View>  
                  <View style={styles.transactionFooter}>  
                    <Text style={styles.description}>  
                      {item.description || item.category.name}  
                    </Text>  
                    <Text style={styles.date}>{formatTransactionDate(item.date)}</Text>  
                  </View>  
                </View>  
              </TouchableOpacity>  
            );  
          }}  
          showsVerticalScrollIndicator={true}  
          contentContainerStyle={styles.listContent}  
        />  
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginTop: 16,
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
  heading: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyText: {
    color: '#666',
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
  },
  // Wrapper to ensure the list takes the right amount of space
  listWrapper: {
    flex: 1,
    ...(Platform.OS === 'web' ? { height: '100%', overflow: 'visible' } : {}),
  },
  listContent: {
    paddingBottom: 100, // Extra space at the bottom for the FAB
    ...(Platform.OS === 'web' ? { minHeight: '100%' } : {}),
  },
  transactionCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
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
  },
  description: {
    fontSize: 14,
    color: '#666',
  },
  date: {
    fontSize: 14,
    color: '#666',
  },
});