import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { Button, Card, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { apiRequest } from '../lib/apiClient';
import { useCategories } from '../hooks/useCategories';
import { useTheme } from '../contexts/ThemeContext';
import { formatCurrency } from '../lib/formatters';

interface Budget {
  id?: number;
  categoryId: number | null;
  amount: number;
  month: number;
  year:number;
}

interface AddBudgetSheetProps {
  budgetId?: number | null;
  onClose: () => void;
  onSave: (budget: Budget) => void;
}

export default function AddBudgetSheet({ budgetId, onClose, onSave }: AddBudgetSheetProps) {
  const { theme } = useTheme();
  const { data: categories } = useCategories('expense');

  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (budgetId) {
      setIsLoading(true);
      apiRequest<Budget>('GET', `/api/budgets/${budgetId}`)
        .then(data => {
          setAmount(data.amount.toString());
          setCategoryId(data.categoryId);
          setMonth(data.month);
          setYear(data.year);
        })
        .catch(() => setError('Failed to load budget data.'))
        .finally(() => setIsLoading(false));
    }
  }, [budgetId]);

  const handleSave = async () => {
    if (!amount) {
      setError('Please enter a budget amount.');
      return;
    }

    const budgetData: Budget = {
      id: budgetId || undefined,
      amount: parseFloat(amount),
      categoryId,
      month,
      year,
    };

    onSave(budgetData);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        {budgetId ? 'Edit Budget' : 'Add Budget'}
      </Text>

      {/* Category Selector */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Category (Optional)</Text>
        <TouchableOpacity
          style={[styles.picker, { borderColor: theme.colors.placeholder }]}
          onPress={() => alert('Category selection modal!')} // Placeholder
        >
          <Text style={{ color: theme.colors.text }}>
            {categoryId ? categories?.find(c => c.id === categoryId)?.name : 'Overall Monthly Budget'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Amount Input */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Amount</Text>
        <TextInput
          style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.placeholder }]}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder={formatCurrency(0)}
          placeholderTextColor={theme.colors.placeholder}
        />
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.buttonContainer}>
        <Button mode="outlined" onPress={onClose} style={{ flex: 1, marginRight: 8 }}>
          Cancel
        </Button>
        <Button mode="contained" onPress={handleSave} style={{ flex: 1 }} loading={isLoading}>
          Save
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    marginBottom: 5,
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  picker: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  errorText: {
    color: '#B00020',
    textAlign: 'center',
    marginBottom: 10,
  },
});
