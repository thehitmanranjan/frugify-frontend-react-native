import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Text } from 'react-native';
import { FAB } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

import Header from '../components/Header';
import DateSelector from '../components/DateSelector';
import TimeRangeSelector from '../components/TimeRangeSelector';
import BudgetSummary from '../components/BudgetSummary';
import TransactionsList from '../components/TransactionsList';
import AddTransactionSheet from '../components/AddTransactionSheet';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  
  const [addTransactionVisible, setAddTransactionVisible] = useState(false);
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');
  
  const showAddTransaction = (type: 'expense' | 'income') => {
    setTransactionType(type);
    setAddTransactionVisible(true);
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <Header />
      
      <View style={styles.content}>
        <DateSelector />
        <TimeRangeSelector />
        <BudgetSummary />
        <TransactionsList />
      </View>
      
      {/* FAB menu for adding transactions */}
      <View style={styles.fabContainer}>
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
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    marginLeft: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
    fontSize: 14,
    marginLeft: 6,
  },
});