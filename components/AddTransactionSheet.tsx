import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
import { Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCategories } from '../hooks/useCategories';
import { useCreateTransaction } from '../hooks/useTransactions';
import { format } from 'date-fns';
import { Calendar } from 'react-native-calendars';
import CategoryIcon from './CategoryIcon';
import { useDate } from '../contexts/DateContext';


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
  const createTransaction = useCreateTransaction();
  const updateTransaction = require('../hooks/useTransactions').useUpdateTransaction();
  const deleteTransaction = require('../hooks/useTransactions').useDeleteTransaction();
  const { currentDate } = useDate();

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
    try {
      if (isEditMode && transaction) {
        await updateTransaction.mutateAsync({
          id: transaction.id,
          amount: parseFloat(amount),
          categoryId: parseInt(categoryId),
          description: description || undefined,
          date: date, // Pass as string
        });
      } else {
        await createTransaction.mutateAsync({
          amount: parseFloat(amount),
          categoryId: parseInt(categoryId),
          description: description || undefined,
          date: date, // Pass as string
        });
      }
      onClose();
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;
    try {
      await deleteTransaction.mutateAsync(transaction.id);
      onClose();
    } catch (error) {
      console.error('Error deleting transaction:', error);
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
        <View style={styles.sheetContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {isEditMode
                ? `Edit ${transactionType === 'income' ? 'Income' : 'Expense'}`
                : `Add ${transactionType === 'income' ? 'Income' : 'Expense'}`}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.formContainer}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Amount</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputPrefix}>₹</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                />
              </View>
              {errors.amount ? (
                <Text style={styles.errorText}>{errors.amount}</Text>
              ) : null}
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Category</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowCategoryPicker(true)}
              >
                <Text style={categoryId ? styles.selectValue : styles.selectPlaceholder}>
                  {categoryId && categories
                    ? categories.find(cat => cat.id.toString() === categoryId)?.name
                    : 'Select a category'}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
              {errors.categoryId ? (
                <Text style={styles.errorText}>{errors.categoryId}</Text>
              ) : null}
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Note (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add a note"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Date</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowCalendar(true)}
              >
                <Text style={styles.selectValue}>
                  {format(new Date(date), 'MMMM d, yyyy')}
                </Text>
                <MaterialCommunityIcons name="calendar" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            
            {isEditMode ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button
                  mode="contained"
                  onPress={handleSubmit}
                  style={[styles.submitButton, { backgroundColor: transactionType === 'income' ? '#4CAF50' : '#2196F3', flex: 1 }]}
                  disabled={updateTransaction.isPending}
                  loading={updateTransaction.isPending}
                >
                  {updateTransaction.isPending ? 'Editing...' : 'Edit'}
                </Button>
                <Button
                  mode="outlined"
                  onPress={handleDelete}
                  style={[styles.submitButton, { borderColor: '#F44336', flex: 1 }]}
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
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>Select Category</Text>
            
            <ScrollView style={styles.pickerList}>
              {isCategoriesLoading ? (
                <Text style={styles.pickerMessage}>Loading categories...</Text>
              ) : !categories || categories.length === 0 ? (
                <Text style={styles.pickerMessage}>No categories available</Text>
              ) : (
                categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={styles.pickerItem}
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
                      <Text style={styles.pickerItemText}>{category.name}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            
            <Button 
              mode="outlined"
              onPress={() => setShowCategoryPicker(false)}
              style={styles.pickerButton}
            >
              Cancel
            </Button>
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
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>Select Date</Text>
            
            <Calendar
              current={date}
              onDayPress={(day: { dateString: string }) => {
                setDate(day.dateString);
                setShowCalendar(false);
              }}
              markedDates={{
                [date]: { selected: true, selectedColor: '#2196F3' }
              }}
              theme={{
                selectedDayBackgroundColor: '#2196F3',
                todayTextColor: '#2196F3',
                arrowColor: '#2196F3',
              }}
            />
            
            <Button 
              mode="outlined"
              onPress={() => setShowCalendar(false)}
              style={styles.pickerButton}
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
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetContainer: {
    backgroundColor: 'white',
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
    color: '#333',
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
    color: '#666',
    backgroundColor: '#f5f5f5',
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
    color: '#333',
  },
  selectPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
    marginTop: 16,
    borderRadius: 8,
    paddingVertical: 8,
  },
  pickerModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerContainer: {
    backgroundColor: 'white',
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
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
    color: '#666',
  },
  pickerButton: {
    marginTop: 16,
  },
});