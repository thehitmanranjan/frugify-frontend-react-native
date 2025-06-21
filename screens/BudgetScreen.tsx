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
import { useTheme } from '../contexts/ThemeContext'; // Import useTheme

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
  const { theme } = useTheme(); // Use theme from context
  const progress = item.spent / item.amount;
  const isOverBudget = item.spent > item.amount;
  
  // Define colors based on theme and budget status
  const overBudgetUIColor = theme.isDarkMode ? '#CF6679' : '#B00020'; // Darker red for dark, standard for light
  const underBudgetUIColor = theme.isDarkMode ? '#03DAC5' : '#4CAF50'; // Teal for dark, green for light
  const progressBarColor = isOverBudget ? overBudgetUIColor : underBudgetUIColor;
  const remainingTextColor = isOverBudget ? overBudgetUIColor : underBudgetUIColor;

  return (
    <Card style={[styles.budgetCard, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.budgetHeader}>
        <View style={styles.categoryInfo}>
          <CategoryIcon name={item.icon} color={item.color} size={16} />
          <Text style={[styles.categoryName, { color: theme.colors.text }]}>{item.categoryName}</Text>
        </View>
        <TouchableOpacity onPress={() => onEdit(item.id)}>
          <MaterialCommunityIcons name="pencil" size={18} color={theme.colors.placeholder} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.budgetAmounts}>
        <Text style={[styles.spentText, { color: theme.colors.placeholder }]}>
          Spent: <Text style={isOverBudget ? [styles.overBudgetText, { color: overBudgetUIColor }] : { color: theme.colors.text }}>{formatCurrency(item.spent)}</Text>
        </Text>
        <Text style={[styles.budgetText, { color: theme.colors.placeholder }]}>
          Budget: {formatCurrency(item.amount)}
        </Text>
      </View>
      
      <ProgressBar 
        progress={Math.min(progress, 1)} 
        color={progressBarColor}
        style={styles.progressBar}
      />
      
      <Text style={[styles.remainingText, { color: remainingTextColor }, isOverBudget && styles.overBudgetText]}>
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
  const { theme } = useTheme(); // Use theme from context
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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading budgets...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header />
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color={theme.isDarkMode ? "#F44336" : "#D32F2F"} />
          <Text style={[styles.errorText, { color: theme.colors.text }]}>{error}</Text>
          <Button 
            mode="contained" 
            onPress={() => navigation.navigate('Home')}
            style={[styles.errorButton, { backgroundColor: theme.colors.primary }]}
            labelStyle={{ color: theme.colors.surface }}
          >
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header />
      
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Monthly Budgets</Text>
          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleAddBudget}
          >
            <MaterialCommunityIcons name="plus" size={20} color={theme.colors.surface} />
            <Text style={[styles.addButtonText, { color: theme.colors.surface }]}>Add Budget</Text>
          </TouchableOpacity>
        </View>
        
        {budgetsWithCategories.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No budgets found for this month. Add a budget to get started!</Text>
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
  container: { // Base container style, background color will be overridden by theme
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: { // Background color will be overridden by theme
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: { // Text color will be overridden by theme
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: { // Background color will be overridden by theme
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: { // Text color will be overridden by theme
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    textAlign: 'center',
  },
  errorButton: { // Background and text color will be overridden by theme
    marginTop: 8,
  },
  emptyContainer: { // Background and text color will be overridden by theme
    padding: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  emptyText: { // Text color will be overridden by theme
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { // Text color will be overridden by theme
    fontSize: 20,
    fontWeight: '600',
  },
  addButton: { // Background and text color will be overridden by theme
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addButtonText: { // Text color will be overridden by theme
    fontWeight: '500',
    marginLeft: 4,
  },
  listContent: {
    paddingBottom: 20,
  },
  budgetCard: { // Background color will be overridden by theme
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
  categoryName: { // Text color will be overridden by theme
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  budgetAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  spentText: { // Text color will be overridden by theme
    fontSize: 14,
  },
  budgetText: { // Text color will be overridden by theme
    fontSize: 14,
  },
  progressBar: { // Progress color is handled in component logic
    height: 6,
    borderRadius: 3,
    marginBottom: 8,
  },
  remainingText: { // Text color is handled in component logic
    fontSize: 14,
    textAlign: 'right',
    fontWeight: '500',
  },
  overBudgetText: { // Text color is handled in component logic
    // This style is primarily for fontWeight or other non-color attributes if needed
    // color: '#F44336', // Color is now handled by theme logic in component
  },
});