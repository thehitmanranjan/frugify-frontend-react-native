import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useCategories, Category } from '../hooks/useCategories';

interface BudgetFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    amount: number;
    month: number;
    year: number;
    categoryId: number | null;
  }) => void;
  initialData?: {
    amount?: number;
    month?: number;
    year?: number;
    categoryId?: number | null;
  };
  isEditing?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Map backend icon names to valid MaterialCommunityIcons names
const iconMap: Record<string, string> = {
  activity: 'heart-pulse',
  banknote: 'cash',
  book: 'book-open-variant',
  briefcase: 'briefcase',
  'credit-card': 'credit-card',
  film: 'movie',
  gift: 'gift',
  home: 'home',
  map: 'map-marker',
  'plus-circle': 'plus-circle',
  'shopping-bag': 'shopping',
  'trending-up': 'trending-up',
  utensils: 'silverware-fork-knife',
  shower: 'shower',
  car: 'car',
  'tshirt-crew': 'tshirt-crew',
  cellphone: 'cellphone',
  'hand-heart': 'hand-heart',
  'account-group': 'account-group',
  laptop: 'laptop',
  hotel: 'bed',
  'flower-tulip': 'flower-tulip',
  flash: 'flash',
};

const resolveIcon = (name: string) => (iconMap[name] || name) as any;

export default function BudgetFormModal({
  visible,
  onClose,
  onSubmit,
  initialData,
  isEditing = false,
}: BudgetFormModalProps) {
  const { theme, isDarkMode } = useTheme();
  const { data: allCategories } = useCategories('expense');
  // Filter client-side since API may return all types
  const categories = React.useMemo(
    () => allCategories?.filter(c => c.type === 'expense'),
    [allCategories]
  );

  const now = new Date();
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [selectedMonth, setSelectedMonth] = useState(initialData?.month || now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(initialData?.year || now.getFullYear());
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    initialData?.categoryId !== undefined ? initialData.categoryId : null
  );
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // Reset form when opened with new data
  React.useEffect(() => {
    if (visible) {
      setAmount(initialData?.amount?.toString() || '');
      setSelectedMonth(initialData?.month || now.getMonth() + 1);
      setSelectedYear(initialData?.year || now.getFullYear());
      setSelectedCategoryId(
        initialData?.categoryId !== undefined ? initialData.categoryId : null
      );
    }
  }, [visible, initialData]);

  const handleSubmit = () => {
    const numAmount = parseFloat(amount);
    if (!amount.trim() || isNaN(numAmount)) {
      Alert.alert('Invalid Amount', 'Please enter a valid numeric amount.');
      return;
    }
    if (numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Budget amount must be greater than zero.');
      return;
    }
    if (numAmount > 10000000) {
      Alert.alert('Invalid Amount', 'Budget amount seems too high. Please check.');
      return;
    }

    onSubmit({
      amount: numAmount,
      month: selectedMonth,
      year: selectedYear,
      categoryId: selectedCategoryId,
    });
    onClose();
  };

  const selectedCategory = categories?.find((c) => c.id === selectedCategoryId);

  const cardBg = isDarkMode ? '#1e1e1e' : '#f8f8f8';
  const inputBg = isDarkMode ? '#2a2a2a' : '#ffffff';
  const borderColor = isDarkMode ? '#333' : '#e0e0e0';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}
          >
            <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  {isEditing ? 'Edit Budget' : 'New Budget'}
                </Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <MaterialCommunityIcons name="close" size={24} color={theme.colors.placeholder} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Amount Input */}
                <Text style={[styles.label, { color: theme.colors.text }]}>Amount (₹)</Text>
                <View style={[styles.amountInputContainer, { backgroundColor: inputBg, borderColor }]}>
                  <Text style={[styles.currencySymbol, { color: theme.colors.primary }]}>₹</Text>
                  <TextInput
                    style={[styles.amountInput, { color: theme.colors.text }]}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.placeholder}
                    autoFocus
                  />
                </View>

                {/* Month / Year Selector */}
                <Text style={[styles.label, { color: theme.colors.text }]}>Period</Text>
                <TouchableOpacity
                  style={[styles.selectorButton, { backgroundColor: inputBg, borderColor }]}
                  onPress={() => setShowMonthPicker(!showMonthPicker)}
                >
                  <MaterialCommunityIcons name="calendar-month" size={20} color={theme.colors.primary} />
                  <Text style={[styles.selectorText, { color: theme.colors.text }]}>
                    {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                  </Text>
                  <MaterialCommunityIcons
                    name={showMonthPicker ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={theme.colors.placeholder}
                  />
                </TouchableOpacity>

                {showMonthPicker && (
                  <View style={[styles.pickerContainer, { backgroundColor: cardBg, borderColor }]}>
                    {/* Year navigation */}
                    <View style={styles.yearNav}>
                      <TouchableOpacity onPress={() => setSelectedYear(selectedYear - 1)}>
                        <MaterialCommunityIcons name="chevron-left" size={28} color={theme.colors.primary} />
                      </TouchableOpacity>
                      <Text style={[styles.yearText, { color: theme.colors.text }]}>{selectedYear}</Text>
                      <TouchableOpacity onPress={() => setSelectedYear(selectedYear + 1)}>
                        <MaterialCommunityIcons name="chevron-right" size={28} color={theme.colors.primary} />
                      </TouchableOpacity>
                    </View>
                    {/* Month grid */}
                    <View style={styles.monthGrid}>
                      {MONTH_NAMES.map((name, index) => {
                        const monthNum = index + 1;
                        const isSelected = monthNum === selectedMonth;
                        return (
                          <TouchableOpacity
                            key={monthNum}
                            style={[
                              styles.monthItem,
                              isSelected && { backgroundColor: theme.colors.primary },
                            ]}
                            onPress={() => {
                              setSelectedMonth(monthNum);
                              setShowMonthPicker(false);
                            }}
                          >
                            <Text
                              style={[
                                styles.monthText,
                                { color: isSelected ? '#fff' : theme.colors.text },
                              ]}
                            >
                              {name.substring(0, 3)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Category Selector */}
                <Text style={[styles.label, { color: theme.colors.text }]}>Category</Text>
                <TouchableOpacity
                  style={[styles.selectorButton, { backgroundColor: inputBg, borderColor }]}
                  onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                >
                  <MaterialCommunityIcons
                    name={selectedCategory ? resolveIcon(selectedCategory.icon) : 'wallet-outline'}
                    size={20}
                    color={selectedCategory?.color || theme.colors.primary}
                  />
                  <Text style={[styles.selectorText, { color: theme.colors.text }]}>
                    {selectedCategoryId === null ? 'Overall Budget (All Categories)' : selectedCategory?.name || 'Select Category'}
                  </Text>
                  <MaterialCommunityIcons
                    name={showCategoryPicker ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={theme.colors.placeholder}
                  />
                </TouchableOpacity>

                {showCategoryPicker && (
                  <ScrollView nestedScrollEnabled style={[styles.categoryList, { backgroundColor: cardBg, borderColor }]}>
                    {/* Overall budget option */}
                    <TouchableOpacity
                      style={[
                        styles.categoryItem,
                        selectedCategoryId === null && { backgroundColor: `${theme.colors.primary}20` },
                      ]}
                      onPress={() => {
                        setSelectedCategoryId(null);
                        setShowCategoryPicker(false);
                      }}
                    >
                      <MaterialCommunityIcons name="wallet-outline" size={20} color={theme.colors.primary} />
                      <Text style={[styles.categoryItemText, { color: theme.colors.text }]}>
                        Overall Budget
                      </Text>
                      {selectedCategoryId === null && (
                        <MaterialCommunityIcons name="check" size={18} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                    {/* Category options */}
                    {categories?.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryItem,
                          selectedCategoryId === cat.id && { backgroundColor: `${cat.color}20` },
                        ]}
                        onPress={() => {
                          setSelectedCategoryId(cat.id);
                          setShowCategoryPicker(false);
                        }}
                      >
                        <MaterialCommunityIcons name={resolveIcon(cat.icon)} size={20} color={cat.color} />
                        <Text style={[styles.categoryItemText, { color: theme.colors.text }]}>
                          {cat.name}
                        </Text>
                        {selectedCategoryId === cat.id && (
                          <MaterialCommunityIcons name="check" size={18} color={cat.color} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </ScrollView>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleSubmit}
              >
                <MaterialCommunityIcons name={isEditing ? 'check' : 'plus'} size={20} color="#fff" />
                <Text style={styles.submitButtonText}>
                  {isEditing ? 'Update Budget' : 'Create Budget'}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '90%',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: '700',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    gap: 10,
  },
  selectorText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 8,
    padding: 12,
  },
  yearNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  yearText: {
    fontSize: 18,
    fontWeight: '700',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthItem: {
    width: '22%',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  monthText: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryList: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 250,
    overflow: 'hidden',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  categoryItemText: {
    flex: 1,
    fontSize: 15,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    marginTop: 24,
    gap: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
