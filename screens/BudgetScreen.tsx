import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

import Header from '../components/Header';
import CategoryIcon from '../components/CategoryIcon';
import { useCategories } from '../hooks/useCategories';
import { formatCurrency } from '../lib/formatters';
import { apiRequest } from '../lib/apiClient';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = StackNavigationProp<RootStackParamList>;

// Budget type definition
interface Budget {
  id: number;
  categoryId: number;
  amount: number;
  spent?: number;
  month: number;
  year: number;
  category?: {
    name: string;
    icon: string;
    color: string;
  };
}

interface BudgetItemProps {
  item: Budget & {
    categoryName: string;
    icon: string;
    color: string;
    spent: number;
  };
  onEdit: (id: number) => void;
}

function BudgetItem({ item, onEdit }: BudgetItemProps) {
  const progress = item.spent / item.amount;
  const isOverBudget = item.spent > item.amount;
  
  return (
    <Card style={styles.budgetCard}>
      <View style={styles.budgetHeader}>
        <View style={styles.categoryInfo}>
          <CategoryIcon name={item.icon} color={item.color} size={16} />
          <Text style={styles.categoryName}>{item.categoryName}</Text>
        </View>
        <TouchableOpacity onPress={() => onEdit(item.id)}>
          <MaterialCommunityIcons name="pencil" size={18} color="#666" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.budgetAmounts}>
        <Text style={styles.spentText}>
          Spent: <Text style={isOverBudget ? styles.overBudgetText : undefined}>{formatCurrency(item.spent)}</Text>
        </Text>
        <Text style={styles.budgetText}>
          Budget: {formatCurrency(item.amount)}
        </Text>
      </View>
      
      <ProgressBar 
        progress={Math.min(progress, 1)} 
        color={isOverBudget ? '#F44336' : '#4CAF50'} 
        style={styles.progressBar}
      />
      
      <Text style={[styles.remainingText, isOverBudget && styles.overBudgetText]}>
        {isOverBudget 
          ? `Over budget by ${formatCurrency(item.spent - item.amount)}` 
          : `${formatCurrency(item.amount - item.spent)} remaining`
        }
      </Text>
    </Card>
  );
}

export default function BudgetScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { data: categories, isLoading: isCategoriesLoading } = useCategories('expense');
  
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingBudgetId, setEditingBudgetId] = useState<number | null>(null);
  
  // Get current month and year
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
  const currentYear = currentDate.getFullYear();
  
  // Fetch budgets from API
  useEffect(() => {
    async function fetchBudgets() {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get budgets for current month/year
        const data = await apiRequest<Budget[]>('GET', `/api/budgets?month=${currentMonth}&year=${currentYear}`);
        console.log('Fetched budgets:', data);
        setBudgets(data || []);
      } catch (err) {
        console.error('Error fetching budgets:', err);
        setError('Failed to load budgets. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchBudgets();
  }, [currentMonth, currentYear]);
  
  // Prepare data for display by combining budgets with category info
  const budgetsWithCategories = budgets.map(budget => {
    const category = categories?.find(c => c.id === budget.categoryId);
    
    return {
      ...budget,
      categoryName: category?.name || 'Unknown Category',
      icon: category?.icon || 'help-circle',
      color: category?.color || '#999999',
      spent: budget.spent || 0 // Use actual spent value or default to 0
    };
  });
  
  const handleEditBudget = (id: number) => {
    setEditingBudgetId(id);
    // In a real app, this would open a modal or navigate to an edit screen
    alert(`Editing budget ${id}`);
  };
  
  const handleAddBudget = () => {
    // In a real app, this would open a modal or navigate to an add budget screen
    alert('Adding new budget');
  };
  
  if (isLoading || isCategoriesLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading budgets...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#F44336" />
          <Text style={styles.errorText}>{error}</Text>
          <Button 
            mode="contained" 
            onPress={() => navigation.navigate('Home')}
            style={styles.errorButton}
          >
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <Header />
      
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Monthly Budgets</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddBudget}
          >
            <MaterialCommunityIcons name="plus" size={20} color="white" />
            <Text style={styles.addButtonText}>Add Budget</Text>
          </TouchableOpacity>
        </View>
        
        {budgetsWithCategories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No budgets found for this month. Add a budget to get started!</Text>
          </View>
        ) : (
          <FlatList
            data={budgetsWithCategories}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <BudgetItem 
                item={item} 
                onEdit={handleEditBudget} 
              />
            )}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
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
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorButton: {
    marginTop: 8,
  },
  emptyContainer: {
    padding: 24,
    backgroundColor: 'white',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 4,
  },
  listContent: {
    paddingBottom: 20,
  },
  budgetCard: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 8,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryName: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  budgetAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  spentText: {
    fontSize: 14,
    color: '#666',
  },
  budgetText: {
    fontSize: 14,
    color: '#666',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 8,
  },
  remainingText: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'right',
    fontWeight: '500',
  },
  overBudgetText: {
    color: '#F44336',
  },
});