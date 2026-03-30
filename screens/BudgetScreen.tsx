import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

import Header from '../components/Header';
import CategoryIcon from '../components/CategoryIcon';
import BudgetProgressBar from '../components/BudgetProgressBar';
import BudgetFormModal from '../components/BudgetFormModal';
import { useCategories } from '../hooks/useCategories';
import {
  useLocalBudgets,
  useCreateLocalBudget,
  useUpdateLocalBudget,
  useDeleteLocalBudget,
} from '../hooks/useBudgets';
import { useCombinedSummary } from '../hooks/useCombinedTransactions';
import { formatCurrency } from '../lib/formatters';
import { getQueryTimeFormat } from '../lib/date-utils';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { LocalBudget } from '../lib/database';
import { useQueryClient } from '@tanstack/react-query';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function BudgetScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme, isDarkMode } = useTheme();
  const queryClient = useQueryClient();
  const { data: categories, isLoading: isCategoriesLoading } = useCategories('expense');

  // Month/Year navigation state
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

  // Local budgets from SQLite
  const { data: budgets, isLoading, refetch } = useLocalBudgets(currentMonth, currentYear);

  // Get transaction summary for spending data
  const startDate = new Date(currentYear, currentMonth - 1, 1);
  const endDate = new Date(currentYear, currentMonth, 0);
  const startDateStr = getQueryTimeFormat(startDate);
  const endDateStr = getQueryTimeFormat(endDate);
  const { data: summary } = useCombinedSummary('month', startDateStr, endDateStr);

  // Mutations
  const createBudget = useCreateLocalBudget();
  const updateBudget = useUpdateLocalBudget();
  const deleteBudget = useDeleteLocalBudget();

  // Modal state
  const [formVisible, setFormVisible] = useState(false);
  const [editingBudget, setEditingBudget] = useState<LocalBudget | null>(null);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentYear);

  // Refreshing state
  const [refreshing, setRefreshing] = useState(false);

  // Calculate spending per category from summary
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

  // Separate overall budget from category budgets
  const { overallBudget, categoryBudgets } = useMemo(() => {
    const overall = budgets?.find((b) => b.categoryId === null) || null;
    const catBudgets = budgets?.filter((b) => b.categoryId !== null) || [];
    return { overallBudget: overall, categoryBudgets: catBudgets };
  }, [budgets]);

  // Month navigation
  const goToPrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToCurrentMonth = () => {
    setCurrentMonth(now.getMonth() + 1);
    setCurrentYear(now.getFullYear());
  };

  // CRUD handlers
  const handleCreateBudget = (data: {
    amount: number;
    month: number;
    year: number;
    categoryId: number | null;
  }) => {
    createBudget.mutate(data, {
      onError: (error) => {
        Alert.alert('Error', error.message);
      },
    });
  };

  const handleUpdateBudget = (data: {
    amount: number;
    month: number;
    year: number;
    categoryId: number | null;
  }) => {
    if (!editingBudget) return;
    updateBudget.mutate({
      localId: editingBudget.localId,
      serverId: editingBudget.serverId,
      updates: {
        amount: data.amount,
        month: data.month,
        year: data.year,
        categoryId: data.categoryId,
      },
    });
  };

  const handleDeleteBudget = (budget: LocalBudget) => {
    Alert.alert(
      'Delete Budget',
      `Are you sure you want to delete this ${budget.categoryId === null ? 'overall' : 'category'} budget?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteBudget.mutate(budget.localId),
        },
      ]
    );
  };

  const openEditForm = (budget: LocalBudget) => {
    setEditingBudget(budget);
    setFormVisible(true);
  };

  const openCreateForm = () => {
    setEditingBudget(null);
    setFormVisible(true);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['local-budgets'] });
    setRefreshing(false);
  };

  const cardBg = isDarkMode ? '#1e1e1e' : '#ffffff';
  const isCurrentMonth = currentMonth === now.getMonth() + 1 && currentYear === now.getFullYear();

  // Render a single category budget card
  const renderCategoryBudgetCard = (budget: LocalBudget) => {
    const category = categories?.find((c) => c.id === budget.categoryId);
    const spent = spendingByCategory[budget.categoryId?.toString() || ''] || 0;

    return (
      <View
        key={budget.localId}
        style={[styles.budgetCard, { backgroundColor: cardBg }]}
      >
        <View style={styles.budgetCardHeader}>
          <View style={styles.categoryInfo}>
            <CategoryIcon
              name={category?.icon || 'help-circle'}
              color={category?.color || '#999'}
              size={18}
            />
            <Text style={[styles.categoryName, { color: theme.colors.text }]}>
              {category?.name || 'Unknown'}
            </Text>
            {budget.syncStatus === 'pending' && (
              <MaterialCommunityIcons name="cloud-upload-outline" size={14} color="#FF9800" style={{ marginLeft: 4 }} />
            )}
            {budget.syncStatus === 'error' && (
              <MaterialCommunityIcons name="alert-circle" size={14} color="#F44336" style={{ marginLeft: 4 }} />
            )}
          </View>
          <View style={styles.budgetActions}>
            <TouchableOpacity
              onPress={() => openEditForm(budget)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.actionIcon}
            >
              <MaterialCommunityIcons name="pencil-outline" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeleteBudget(budget)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.actionIcon}
            >
              <MaterialCommunityIcons name="delete-outline" size={18} color="#F44336" />
            </TouchableOpacity>
          </View>
        </View>

        <BudgetProgressBar
          label=""
          spent={spent}
          budget={budget.amount}
          color={category?.color}
        />
      </View>
    );
  };

  if (isLoading) {
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

  const totalSpent = spendingByCategory['overall'] || 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header />

      <FlatList
        data={categoryBudgets}
        keyExtractor={(item) => item.localId}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListHeaderComponent={
          <>
            {/* Month Navigator */}
            <View style={[styles.monthNav, { backgroundColor: cardBg }]}>
              <TouchableOpacity onPress={goToPrevMonth} style={styles.navArrow}>
                <MaterialCommunityIcons name="chevron-left" size={28} color={theme.colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setPickerYear(currentYear); setMonthPickerVisible(true); }} style={styles.monthLabel}>
                <Text style={[styles.monthText, { color: theme.colors.text }]}>
                  {MONTH_NAMES[currentMonth - 1]} {currentYear}
                </Text>
                {!isCurrentMonth && (
                  <Text style={[styles.todayHint, { color: theme.colors.primary }]}>Tap to jump</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={goToNextMonth} style={styles.navArrow}>
                <MaterialCommunityIcons name="chevron-right" size={28} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Title + Add button */}
            <View style={styles.titleRow}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Budgets
              </Text>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
                onPress={openCreateForm}
              >
                <MaterialCommunityIcons name="plus" size={18} color="#fff" />
                <Text style={styles.addButtonText}>Add Budget</Text>
              </TouchableOpacity>
            </View>

            {/* Overall Budget Card */}
            {overallBudget ? (
              <View style={[styles.overallCard, { backgroundColor: cardBg }]}>
                <View style={styles.budgetCardHeader}>
                  <View style={styles.categoryInfo}>
                    <MaterialCommunityIcons name="wallet" size={22} color={theme.colors.primary} />
                    <Text style={[styles.overallTitle, { color: theme.colors.text }]}>
                      Overall Budget
                    </Text>
                    {overallBudget.syncStatus === 'pending' && (
                      <MaterialCommunityIcons name="cloud-upload-outline" size={14} color="#FF9800" style={{ marginLeft: 4 }} />
                    )}
                  </View>
                  <View style={styles.budgetActions}>
                    <TouchableOpacity
                      onPress={() => openEditForm(overallBudget)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.actionIcon}
                    >
                      <MaterialCommunityIcons name="pencil-outline" size={18} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteBudget(overallBudget)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.actionIcon}
                    >
                      <MaterialCommunityIcons name="delete-outline" size={18} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                </View>

                <BudgetProgressBar
                  label=""
                  spent={totalSpent}
                  budget={overallBudget.amount}
                />

                <View style={[styles.overallSummary, { borderTopColor: isDarkMode ? '#333' : '#f0f0f0' }]}>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { color: theme.colors.placeholder }]}>Budget</Text>
                    <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                      {formatCurrency(overallBudget.amount)}
                    </Text>
                  </View>
                  <View style={[styles.summaryDivider, { backgroundColor: isDarkMode ? '#333' : '#f0f0f0' }]} />
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { color: theme.colors.placeholder }]}>Spent</Text>
                    <Text style={[styles.summaryValue, { color: totalSpent > overallBudget.amount ? '#E53935' : '#4CAF50' }]}>
                      {formatCurrency(totalSpent)}
                    </Text>
                  </View>
                  <View style={[styles.summaryDivider, { backgroundColor: isDarkMode ? '#333' : '#f0f0f0' }]} />
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { color: theme.colors.placeholder }]}>Remaining</Text>
                    <Text style={[styles.summaryValue, { color: overallBudget.amount - totalSpent >= 0 ? '#4CAF50' : '#E53935' }]}>
                      {formatCurrency(overallBudget.amount - totalSpent)}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.emptyOverallCard, { backgroundColor: cardBg, borderColor: isDarkMode ? '#333' : '#e0e0e0' }]}
                onPress={openCreateForm}
              >
                <MaterialCommunityIcons name="wallet-plus-outline" size={32} color={theme.colors.primary} />
                <Text style={[styles.emptyOverallText, { color: theme.colors.text }]}>
                  Set an Overall Budget
                </Text>
                <Text style={[styles.emptyOverallHint, { color: theme.colors.placeholder }]}>
                  Track your total spending for {MONTH_NAMES[currentMonth - 1]}
                </Text>
              </TouchableOpacity>
            )}

            {/* Category Budgets Section Header */}
            {categoryBudgets.length > 0 && (
              <Text style={[styles.sectionSubtitle, { color: theme.colors.text }]}>
                Category Budgets
              </Text>
            )}
          </>
        }
        renderItem={({ item }) => renderCategoryBudgetCard(item)}
        ListEmptyComponent={
          categoryBudgets.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="tag-outline" size={40} color={theme.colors.placeholder} />
              <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>
                No category budgets yet
              </Text>
              <Text style={[styles.emptySubText, { color: theme.colors.placeholder }]}>
                Add budgets for specific categories to track spending
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Budget Form Modal */}
      <BudgetFormModal
        visible={formVisible}
        onClose={() => {
          setFormVisible(false);
          setEditingBudget(null);
        }}
        onSubmit={editingBudget ? handleUpdateBudget : handleCreateBudget}
        isEditing={!!editingBudget}
        initialData={
          editingBudget
            ? {
                amount: editingBudget.amount,
                month: editingBudget.month,
                year: editingBudget.year,
                categoryId: editingBudget.categoryId,
              }
            : {
                month: currentMonth,
                year: currentYear,
              }
        }
      />
      {/* Month/Year Picker Modal */}
      <Modal
        visible={monthPickerVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setMonthPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setMonthPickerVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={[styles.pickerModal, { backgroundColor: isDarkMode ? '#1e1e1e' : '#fff' }]}>
            {/* Year row */}
            <View style={styles.pickerYearRow}>
              <TouchableOpacity onPress={() => setPickerYear(pickerYear - 1)} style={styles.pickerYearArrow}>
                <MaterialCommunityIcons name="chevron-left" size={28} color={theme.colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.pickerYearText, { color: theme.colors.text }]}>{pickerYear}</Text>
              <TouchableOpacity onPress={() => setPickerYear(pickerYear + 1)} style={styles.pickerYearArrow}>
                <MaterialCommunityIcons name="chevron-right" size={28} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Month grid */}
            <View style={styles.pickerMonthGrid}>
              {MONTH_NAMES.map((name, index) => {
                const m = index + 1;
                const isSelected = m === currentMonth && pickerYear === currentYear;
                const isCurrent = m === now.getMonth() + 1 && pickerYear === now.getFullYear();
                return (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.pickerMonthItem,
                      isSelected && { backgroundColor: theme.colors.primary },
                      isCurrent && !isSelected && { borderColor: theme.colors.primary, borderWidth: 1.5 },
                    ]}
                    onPress={() => {
                      setCurrentMonth(m);
                      setCurrentYear(pickerYear);
                      setMonthPickerVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerMonthText,
                        { color: isSelected ? '#fff' : theme.colors.text },
                        isCurrent && !isSelected && { color: theme.colors.primary, fontWeight: '700' },
                      ]}
                    >
                      {name.substring(0, 3)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Today button */}
            <TouchableOpacity
              style={[styles.pickerTodayBtn, { backgroundColor: `${theme.colors.primary}15` }]}
              onPress={() => {
                setCurrentMonth(now.getMonth() + 1);
                setCurrentYear(now.getFullYear());
                setMonthPickerVisible(false);
              }}
            >
              <MaterialCommunityIcons name="calendar-today" size={16} color={theme.colors.primary} />
              <Text style={[styles.pickerTodayText, { color: theme.colors.primary }]}>Go to Today</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  // Month Navigator
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  navArrow: {
    padding: 8,
  },
  monthLabel: {
    alignItems: 'center',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '700',
  },
  todayHint: {
    fontSize: 11,
    marginTop: 2,
  },
  // Month Picker Modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModal: {
    width: '85%',
    borderRadius: 20,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  pickerYearRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pickerYearArrow: {
    padding: 4,
  },
  pickerYearText: {
    fontSize: 22,
    fontWeight: '800',
  },
  pickerMonthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  pickerMonthItem: {
    width: '22%',
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 10,
  },
  pickerMonthText: {
    fontSize: 15,
    fontWeight: '500',
  },
  pickerTodayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  pickerTodayText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Title row
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  // Overall Budget Card
  overallCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 16,
  },
  overallTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 8,
  },
  overallSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  summaryDivider: {
    width: 1,
    height: '100%',
  },
  // Empty overall card
  emptyOverallCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  emptyOverallText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  emptyOverallHint: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  // Category budgets
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 4,
  },
  budgetCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    marginBottom: 10,
  },
  budgetCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryName: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '600',
  },
  budgetActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIcon: {
    padding: 4,
  },
  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
  },
  emptySubText: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 32,
  },
});