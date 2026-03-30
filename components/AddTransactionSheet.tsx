import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Platform, ScrollView, KeyboardAvoidingView, Alert } from 'react-native';
import { Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCategories } from '../hooks/useCategories';
import { useCreateLocalTransaction } from '../hooks/useLocalTransactions';
import { format } from 'date-fns';
import { Calendar } from 'react-native-calendars';
import CategoryIcon from './CategoryIcon';
import { useDate } from '../contexts/DateContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalBudgets } from '../hooks/useBudgets';
import { useCombinedSummary } from '../hooks/useCombinedTransactions';
import { getQueryTimeFormat } from '../lib/date-utils';


interface AddTransactionSheetProps {
  isVisible: boolean;
  transactionType: 'expense' | 'income';
  onClose: () => void;
  transaction?: import('../hooks/useTransactions').TransactionWithCategory | null;
}

export default function AddTransactionSheet({
  isVisible,
  transactionType,
  onClose,
  transaction,
}: AddTransactionSheetProps) {
  const isEditMode = !!transaction;
  const { data: categories, isLoading: isCategoriesLoading } = useCategories(transactionType);
  const createTransaction = useCreateLocalTransaction(); // Use local-first hook
  const updateTransactionLocal = require('../hooks/useLocalTransactions').useUpdateLocalTransaction();
  const deleteTransaction = require('../hooks/useTransactions').useDeleteTransaction();
  const { currentDate } = useDate();
  const { theme } = useTheme();
  const createCategory = require('../hooks/useCategories').useCreateCategory();

  // Form state


  // Form state
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // UI state
  const [errors, setErrors] = useState({
    amount: '',
    categoryId: '',
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);

  // New category form state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#2196F3');
  const [newCategoryIcon, setNewCategoryIcon] = useState('home');
  const [addCategoryError, setAddCategoryError] = useState('');

  // Color and icon options (copied from SettingsScreen)
  const colorOptions = [
    '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722', '#795548', '#607D8B',
  ];
  const iconOptions = [
    { name: 'home', label: 'Home' },
    { name: 'shopping-bag', label: 'Shopping' },
    { name: 'utensils', label: 'Food' },
    { name: 'credit-card', label: 'Bills' },
    { name: 'film', label: 'Entertainment' },
    { name: 'map', label: 'Transport' },
    { name: 'book', label: 'Education' },
    { name: 'briefcase', label: 'Work' },
    { name: 'activity', label: 'Health' },
    { name: 'gift', label: 'Gifts' },
    { name: 'banknote', label: 'Income' },
    { name: 'trending-up', label: 'Investments' },
    { name: 'shower', label: 'Body Care' },
    { name: 'car', label: 'Cab' },
    { name: 'tshirt-crew', label: 'Clothes' },
    { name: 'cellphone', label: 'Communications' },
    { name: 'hand-heart', label: 'Donation' },
    { name: 'silverware-fork-knife', label: 'Eating Out' },
    { name: 'food', label: 'Ordered Food' },
    { name: 'account-group', label: 'Family' },
    { name: 'gas-station', label: 'Fuel' },
    { name: 'laptop', label: 'Gadgets' },
    { name: 'heart-pulse', label: 'Health' },
    { name: 'hotel', label: 'Hotel' },
    { name: 'airplane', label: 'Trip' },
    { name: 'sofa', label: 'House Decor' },
    { name: 'dots-horizontal', label: 'Miscellaneous' },
    { name: 'parking', label: 'Parking' },
    { name: 'flower-tulip', label: 'Puja' },
    { name: 'monitor', label: 'Tech' },
    { name: 'school', label: 'Study' },
    { name: 'flash', label: 'Utilities' },
    { name: 'delete', label: 'Waste' },
  ];

  // Budget tracking calculations
  const parsedDate = new Date(date);
  const txMonth = parsedDate.getMonth() + 1;
  const txYear = parsedDate.getFullYear();

  const { data: budgets } = useLocalBudgets(txMonth, txYear);

  const startDate = new Date(txYear, txMonth - 1, 1);
  const endDate = new Date(txYear, txMonth, 0);
  const startQuery = getQueryTimeFormat(startDate);
  const endQuery = getQueryTimeFormat(endDate);
  const { data: summary } = useCombinedSummary('month', startQuery, endQuery);
  
  // Calculate if adding/editing this expense will exceed budget
  let budgetWarning: string | null = null;
  let isOverBudgetForSave = false;

  if (transactionType === 'expense' && amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && budgets && summary) {
    const numAmount = parseFloat(amount);
    const overallBudget = budgets.find((b) => b.categoryId === null);
    const categoryBudget = categoryId ? budgets.find((b) => b.categoryId?.toString() === categoryId) : null;
    const selectedCategoryName = categories?.find(c => c.id.toString() === categoryId)?.name || 'the selected category';

    let totalSpentAlready = 0;
    let categorySpentAlready = 0;

    if (summary.categoryData) {
      for (const cat of summary.categoryData) {
        if (cat.type === 'expense') {
          totalSpentAlready += cat.amount;
          if (cat.id.toString() === categoryId) {
            categorySpentAlready = cat.amount;
          }
        }
      }
    }

    // Adjust spent amounts if editing the same transaction in the same month
    if (isEditMode && transaction && new Date(transaction.date).getMonth() + 1 === txMonth && new Date(transaction.date).getFullYear() === txYear && transaction.category?.type === 'expense') {
      if (transaction.categoryId.toString() === categoryId) {
        categorySpentAlready -= transaction.amount;
      }
      totalSpentAlready -= transaction.amount;
    }

    // Check category budget first as it's more specific
    if (categoryBudget && categorySpentAlready + numAmount > categoryBudget.amount) {
      isOverBudgetForSave = true;
      budgetWarning = `⚠️ Warning: This will exceed your ${selectedCategoryName} budget for this month.`;
    } else if (overallBudget && totalSpentAlready + numAmount > overallBudget.amount) {
      isOverBudgetForSave = true;
      budgetWarning = `⚠️ Warning: This will exceed your overall monthly budget.`;
    }
  }

  // Prefill form in edit mode
  useEffect(() => {
    if (isVisible) {
      if (isEditMode && transaction) {
        setAmount(transaction.amount.toString());
        setCategoryId(transaction.categoryId.toString());
        setDescription(transaction.description || '');
        setDate(format(new Date(transaction.date), 'yyyy-MM-dd'));
      } else {
        setAmount('');
        setCategoryId('');
        setDescription('');
        setDate(format(currentDate, 'yyyy-MM-dd'));
      }
      setErrors({ amount: '', categoryId: '' });
    }
  }, [isVisible, transactionType, isEditMode, transaction, currentDate]);

  const executeSave = () => {
    // Close modal immediately for instant feedback
    onClose();
    
    // Save in background (non-blocking)
    try {
      if (isEditMode && transaction) {
        updateTransactionLocal.mutate({
          localId: (transaction as any)._localId,
          serverId: transaction.id,
          updates: {
            amount: parseFloat(amount),
            categoryId: parseInt(categoryId),
            description: description || undefined,
            date: date,
          }
        });
      } else {
        // Save locally first - happens in background
        createTransaction.mutate({
          amount: parseFloat(amount),
          categoryId: parseInt(categoryId),
          description: description || undefined,
          date: date,
        });
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  const handleSubmit = async () => {
    // Validate form
    const newErrors = { amount: '', categoryId: '' };
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      newErrors.amount = 'Amount is required and must be a positive number';
    }
    if (!categoryId) {
      newErrors.categoryId = 'Category is required';
    }
    setErrors(newErrors);
    if (newErrors.amount || newErrors.categoryId) return;
    
    // Intercept if over budget
    if (isOverBudgetForSave) {
      Alert.alert(
        'Budget Exceeded',
        'This transaction will exceed your monthly budget. Do you still want to save it?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save Anyway', style: 'destructive', onPress: executeSave }
        ]
      );
    } else {
      executeSave();
    }
  };

  const deleteTransactionLocal = require('../hooks/useLocalTransactions').useDeleteLocalTransaction();

  const handleDelete = async () => {
    if (!transaction) return;
    try {
      const localId = (transaction as any)._localId;
      if (localId) {
        // This transaction exists in local SQLite, delete it locally (which also triggers the background API delete if synced)
        await deleteTransactionLocal.mutateAsync(localId);
      } else {
        // Purely remote transaction, hit the standard API delete
        await deleteTransaction.mutateAsync(transaction.id);
      }
      onClose();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  // Add category handler (call SettingsScreen's logic for creating a category)
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      setAddCategoryError('Category name is required');
      return;
    }
    try {
      createCategory.mutate({
        name: newCategoryName,
        type: transactionType,
        color: newCategoryColor,
        icon: newCategoryIcon,
      }, {
        // onSuccess callback to select the new category
        onSuccess: (data: { id?: number }) => {
          // Try to set the new category as selected
          if (data && data.id) {
            setCategoryId(data.id.toString());
          } else if (categories && categories.length > 0) {
            // Fallback: select the last category (assuming it's appended)
            setCategoryId(categories[categories.length - 1].id.toString());
          }
        }
      });
      setShowAddCategory(false);
      setShowCategoryPicker(false);
      setNewCategoryName('');
      setAddCategoryError('');
    } catch (e) {
      setAddCategoryError('Failed to add category.');
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={[styles.sheetContainer, { backgroundColor: theme.colors.surface }]}> 
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {isEditMode
                ? `Edit ${transactionType === 'income' ? 'Income' : 'Expense'}`
                : `Add ${transactionType === 'income' ? 'Income' : 'Expense'}`}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.formContainer}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]} >Amount</Text>
              <View style={styles.inputContainer}>
                <Text style={[styles.inputPrefix, { color: theme.colors.placeholder, backgroundColor: theme.colors.background }]}>₹</Text>
                <TextInput
                  style={[styles.input, { color: theme.colors.text }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.placeholder}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                />
              </View>
              {errors.amount ? (
                <Text style={[styles.errorText, { color: theme.colors.error || '#F44336' }]}>{errors.amount}</Text>
              ) : null}
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Category</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowCategoryPicker(true)}
              >
                <Text style={categoryId ? [styles.selectValue, { color: theme.colors.text }] : [styles.selectPlaceholder, { color: theme.colors.placeholder }] }>
                  {categoryId && categories
                    ? categories.find(cat => cat.id.toString() === categoryId)?.name
                    : 'Select a category'}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color={theme.colors.placeholder} />
              </TouchableOpacity>
              {errors.categoryId ? (
                <Text style={[styles.errorText, { color: theme.colors.error || '#F44336' }]}>{errors.categoryId}</Text>
              ) : null}
              {budgetWarning && !errors.amount && !errors.categoryId ? (
                <View style={styles.warningContainer}>
                  <MaterialCommunityIcons name="alert-circle" size={16} color="#FF9800" />
                  <Text style={styles.warningText}>{budgetWarning}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Note (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea, { color: theme.colors.text }]}
                placeholder="Add a note"
                placeholderTextColor={theme.colors.placeholder}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Date</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowCalendar(true)}
              >
                <Text style={[styles.selectValue, { color: theme.colors.text }]}>
                  {format(new Date(date), 'MMMM d, yyyy')}
                </Text>
                <MaterialCommunityIcons name="calendar" size={20} color={theme.colors.placeholder} />
              </TouchableOpacity>
            </View>
            
            {isEditMode ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button
                  mode="contained"
                  onPress={handleSubmit}
                  style={[styles.submitButton, { backgroundColor: transactionType === 'income' ? '#4CAF50' : '#2196F3', flex: 1 }]}
                  contentStyle={{ paddingVertical: 8 }}
                  disabled={updateTransactionLocal.isPending}
                  loading={updateTransactionLocal.isPending}
                >
                  {updateTransactionLocal.isPending ? 'Editing...' : 'Edit'}
                </Button>
                <Button
                  mode="outlined"
                  onPress={handleDelete}
                  style={[styles.submitButton, { borderColor: '#F44336', flex: 1 }]}
                  contentStyle={{ paddingVertical: 8 }}
                  textColor="#F44336"
                  disabled={deleteTransaction.isPending}
                  loading={deleteTransaction.isPending}
                >
                  {deleteTransaction.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </View>
            ) : (
              <Button
                mode="contained"
                onPress={handleSubmit}
                style={[styles.submitButton, { backgroundColor: transactionType === 'income' ? '#4CAF50' : '#2196F3' }]}
                contentStyle={{ paddingVertical: 8 }}
                disabled={createTransaction.isPending}
                loading={createTransaction.isPending}
              >
                {createTransaction.isPending ? 'Saving...' : 'Save'}
              </Button>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={[styles.pickerContainer, { backgroundColor: theme.colors.surface }]}> 
            <Text style={[styles.pickerTitle, { color: theme.colors.text }]}>Select Category</Text>
            <ScrollView style={styles.pickerList}>
              {isCategoriesLoading ? (
                <Text style={[styles.pickerMessage, { color: theme.colors.placeholder }]}>Loading categories...</Text>
              ) : !categories || categories.length === 0 ? (
                <Text style={[styles.pickerMessage, { color: theme.colors.placeholder }]}>No categories available</Text>
              ) : (
                categories
                  .filter(category => category.type === transactionType)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.pickerItem,
                        { borderBottomColor: theme.dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }
                      ]}
                      onPress={() => {
                        setCategoryId(category.id.toString());
                        setShowCategoryPicker(false);
                      }}
                    >
                      <View style={styles.pickerItemContent}>
                        <CategoryIcon
                          name={category.icon}
                          color={category.color}
                          size={16}
                          style={styles.pickerIcon}
                        />
                        <Text style={[styles.pickerItemText, { color: theme.colors.text }]}>{category.name}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
              )}
            </ScrollView>
            <Button 
              mode="outlined"
              onPress={() => setShowAddCategory(true)}
              style={styles.pickerButton}
              textColor={theme.colors.primary}
            >
              + Add Category
            </Button>
            <Button 
              mode="outlined"
              onPress={() => setShowCategoryPicker(false)}
              style={styles.pickerButton}
              textColor={theme.colors.primary}
            >
              Cancel
            </Button>
          </View>
        </View>
      </Modal>
      {/* Add Category Modal */}
      <Modal
        visible={showAddCategory}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddCategory(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={[styles.addCategoryDialog, { backgroundColor: theme.colors.surface, flexDirection: 'column' }]}> 
            <ScrollView contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false} style={{ flexGrow: 1 }}>
              <Text style={[styles.pickerTitle, { color: theme.colors.text }]}>Add Category</Text>
              <Text style={[styles.label, { color: theme.colors.text }]}>Category Name</Text>
              <TextInput
                style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.placeholder, width: '100%' }]
                }
                placeholder="Category name"
                placeholderTextColor={theme.colors.placeholder}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
              />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Color</Text>
              <View style={styles.colorGridSettings}>
                {colorOptions.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOptionSettings,
                      { backgroundColor: color },
                      newCategoryColor === color && styles.selectedColorOptionSettings,
                      newCategoryColor === color && { borderColor: theme.colors.primary },
                    ]}
                    onPress={() => setNewCategoryColor(color)}
                  />
                ))}
              </View>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Icon</Text>
              <View style={styles.iconGridSettings}>
                {iconOptions.map((icon) => (
                  <TouchableOpacity
                    key={icon.name}
                    style={[
                      styles.iconOptionSettings,
                      newCategoryIcon === icon.name && styles.selectedIconOptionSettings,
                      newCategoryIcon === icon.name && { borderColor: theme.colors.primary },
                    ]}
                    onPress={() => setNewCategoryIcon(icon.name)}
                  >
                    <CategoryIcon 
                      name={icon.name} 
                      color={newCategoryIcon === icon.name ? newCategoryColor : theme.colors.placeholder}
                      size={20}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              {addCategoryError ? <Text style={styles.errorText}>{addCategoryError}</Text> : null}
            </ScrollView>
            <View style={styles.addCategoryActionsBar}>
              <Button
                onPress={() => setShowAddCategory(false)}
                style={{ marginRight: 8 }}
                textColor={theme.colors.primary}
                mode="text"
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleAddCategory}
                style={{ borderRadius: 8 }}
              >
                Save
              </Button>
            </View>
          </View>
        </View>
      </Modal>
      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={[styles.pickerContainer, { backgroundColor: theme.colors.surface }]}> 
            <Text style={[styles.pickerTitle, { color: theme.colors.text }]}>Select Date</Text>
            <Calendar
              current={date}
              onDayPress={(day: { dateString: string }) => {
                setDate(day.dateString);
                setShowCalendar(false);
              }}
              markedDates={{
                [date]: { selected: true, selectedColor: theme.colors.primary }
              }}
              theme={{
                backgroundColor: theme.colors.surface,
                calendarBackground: theme.colors.surface,
                textSectionTitleColor: theme.colors.text,
                selectedDayBackgroundColor: theme.colors.primary,
                selectedDayTextColor: theme.colors.surface,
                todayTextColor: theme.colors.primary,
                dayTextColor: theme.colors.text,
                textDisabledColor: theme.colors.placeholder,
                dotColor: theme.colors.primary,
                selectedDotColor: theme.colors.surface,
                arrowColor: theme.colors.primary,
                monthTextColor: theme.colors.text,
                indicatorColor: theme.colors.primary,
                textDayFontWeight: '500',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '500',
                textDayFontSize: 16,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 14,
              }}
            />
            <Button 
              mode="outlined"
              onPress={() => setShowCalendar(false)}
              style={styles.pickerButton}
              textColor={theme.colors.primary}
            >
              Cancel
            </Button>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)', // overlay can stay
  },
  sheetContainer: {
    // backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    minHeight: '60%',
    maxHeight: '90%',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  formContainer: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    // color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  inputPrefix: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    // color: '#666',
    // backgroundColor: '#f5f5f5',
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectValue: {
    fontSize: 16,
    // color: '#333',
  },
  selectPlaceholder: {
    fontSize: 16,
    // color: '#999',
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  warningText: {
    color: '#FF9800',
    fontSize: 13,
    marginLeft: 6,
    flex: 1,
    fontWeight: '500',
  },
  submitButton: {
    marginTop: 16,
    borderRadius: 8,
  },
  pickerModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerContainer: {
    // backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerList: {
    maxHeight: 300,
  },
  pickerItem: {
    paddingVertical: 12,
  },
  pickerItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerIcon: {
    marginRight: 10,
    width: 32,
    height: 32,
  },
  pickerItemText: {
    fontSize: 16,
  },
  pickerMessage: {
    textAlign: 'center',
    padding: 20,
    // color: '#666',
  },
  pickerButton: {
    marginTop: 16,
  },
  addCategoryDialog: {
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '85%',
    alignSelf: 'center',
  },
  colorGridSettings: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  colorOptionSettings: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedColorOptionSettings: {
    borderWidth: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  iconGridSettings: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  iconOptionSettings: {
    width: '22%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  selectedIconOptionSettings: {
    borderWidth: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 8,
  },
  addCategoryActionsBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#eee',
    backgroundColor: 'transparent',
  },
});