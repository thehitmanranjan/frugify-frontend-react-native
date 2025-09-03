import React, { useState } from 'react';
import { View, StyleSheet, Text, FlatList, ActivityIndicator, TouchableOpacity, Modal, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

import Header from '../components/Header';
import CategoryIcon from '../components/CategoryIcon';
import AddBudgetSheet from '../components/AddBudgetSheet';
import { useCategories } from '../hooks/useCategories';
import { useBudgets, useAddBudget, useUpdateBudget, useDeleteBudget, Budget, BudgetData } from '../hooks/useBudgets';
import { formatCurrency } from '../lib/formatters';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface BudgetItemProps {
  item: Budget & {
    categoryName: string;
    icon: string;
    color: string;
    spent: number;
  };
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

function BudgetItem({ item, onEdit, onDelete }: BudgetItemProps) {
  const { theme } = useTheme();
  const progress = item.amount > 0 ? (item.spent || 0) / item.amount : 0;
  const isOverBudget = (item.spent || 0) > item.amount;

  const overBudgetUIColor = theme.isDarkMode ? '#CF6679' : '#B00020';
  const underBudgetUIColor = theme.isDarkMode ? '#03DAC5' : '#4CAF50';
  const progressBarColor = isOverBudget ? overBudgetUIColor : underBudgetUIColor;
  const remainingTextColor = isOverBudget ? overBudgetUIColor : underBudgetUIColor;

  return (
    <Card style={[styles.budgetCard, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.budgetHeader}>
        <View style={styles.categoryInfo}>
          <CategoryIcon name={item.icon} color={item.color} size={16} />
          <Text style={[styles.categoryName, { color: theme.colors.text }]}>{item.categoryName}</Text>
        </View>
        <View style={styles.actions}>
            <TouchableOpacity onPress={() => onEdit(item.id)} style={{marginRight: 10}}>
                <MaterialCommunityIcons name="pencil" size={18} color={theme.colors.placeholder} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(item.id)}>
                <MaterialCommunityIcons name="delete" size={18} color={theme.colors.placeholder} />
            </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.budgetAmounts}>
        <Text style={[styles.spentText, { color: theme.colors.placeholder }]}>
          Spent: <Text style={isOverBudget ? [styles.overBudgetText, { color: overBudgetUIColor }] : { color: theme.colors.text }}>{formatCurrency(item.spent || 0)}</Text>
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
          ? `Over budget by ${formatCurrency((item.spent || 0) - item.amount)}`
          : `${formatCurrency(item.amount - (item.spent || 0))} remaining`
        }
      </Text>
    </Card>
  );
}

export default function BudgetScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { data: categories, isLoading: isCategoriesLoading } = useCategories('expense');
  
  const [isSheetVisible, setSheetVisible] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<number | null>(null);
  
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  
  const { data: budgets, isLoading: isBudgetsLoading, error } = useBudgets(currentMonth, currentYear);
  const addBudget = useAddBudget();
  const updateBudget = useUpdateBudget();
  const deleteBudget = useDeleteBudget();

  const budgetsWithCategories = budgets?.map(budget => {
    const category = categories?.find(c => c.id === budget.categoryId);
    return {
      ...budget,
      categoryName: category?.name || 'Overall Budget',
      icon: category?.icon || 'cash-multiple',
      color: category?.color || '#999999',
      spent: budget.spent || 0,
    };
  }) ?? [];

  const handleEditBudget = (id: number) => {
    setEditingBudgetId(id);
    setSheetVisible(true);
  };

  const handleAddBudget = () => {
    setEditingBudgetId(null);
    setSheetVisible(true);
  };

  const handleDeleteBudget = (id: number) => {
    Alert.alert(
      "Delete Budget",
      "Are you sure you want to delete this budget?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "OK", onPress: () => deleteBudget.mutate(id) }
      ]
    );
  };

  const handleSaveBudget = (budgetData: BudgetData) => {
    if (editingBudgetId) {
      updateBudget.mutate({ ...budgetData, id: editingBudgetId });
    } else {
      addBudget.mutate(budgetData);
    }
    setSheetVisible(false);
  };
  
  if (isBudgetsLoading || isCategoriesLoading) {
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
          <Text style={[styles.errorText, { color: theme.colors.text }]}>Failed to load budgets. Please try again.</Text>
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
            <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No budgets found for this month. Add one to get started!</Text>
          </View>
        ) : (
          <FlatList
            data={budgetsWithCategories}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <BudgetItem 
                item={item} 
                onEdit={handleEditBudget}
                onDelete={handleDeleteBudget}
              />
            )}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      <Modal
        visible={isSheetVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSheetVisible(false)}
      >
        <View style={styles.modalOverlay}>
            <AddBudgetSheet
                budgetId={editingBudgetId}
                onClose={() => setSheetVisible(false)}
                onSave={handleSaveBudget}
            />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
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
    textAlign: 'center',
  },
  errorButton: {
    marginTop: 8,
  },
  emptyContainer: {
    padding: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  emptyText: {
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
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addButtonText: {
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
  actions: {
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
  },
  budgetText: {
    fontSize: 14,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 8,
  },
  remainingText: {
    fontSize: 14,
    textAlign: 'right',
    fontWeight: '500',
  },
  overBudgetText: {
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
});