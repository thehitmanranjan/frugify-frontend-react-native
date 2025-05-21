import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '../lib/apiClient';
import { Category } from './useCategories';

// Transaction type
export interface Transaction {
  id: number;
  amount: number;
  date: string;
  description?: string;
  categoryId: number;
  category?: Category;
}

// Transaction with category details
export interface TransactionWithCategory extends Transaction {
  category: Category;
}

// Summary type
export interface Summary {
  income: number;
  expense: number;
  balance: number;
  categoryData: {
    id: number;
    name: string;
    type: string;
    icon: string;
    color: string;
    amount: number;
  }[];
  transactions: TransactionWithCategory[];
}

// Get all transactions
export function useTransactions(timeRange: string, startDateStr?: string, endDateStr?: string) {
  return useQuery({
    queryKey: ['/api/transactions', timeRange, startDateStr, endDateStr],
    queryFn: async () => {
      let endpoint = '/api/transactions';
      if (startDateStr && endDateStr) {
        endpoint += `?startDate=${startDateStr}&endDate=${endDateStr}`;
      }
      const data = await apiRequest<TransactionWithCategory[]>('GET', endpoint);
      return data;
    },
  });
}

// Get a single transaction
export function useTransaction(id: number) {
  return useQuery({
    queryKey: ['/api/transactions', id],
    queryFn: async () => {
      const data = await apiRequest<Transaction>('GET', `/api/transactions/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

// Get summary data (transactions and category aggregations)
export function useSummary(timeRange: string, startDateStr?: string, endDateStr?: string) {
  return useQuery({
    queryKey: ['/api/transactions/summary', timeRange, startDateStr, endDateStr],
    queryFn: async () => {
      // Use the correct endpoint path with /transactions/summary
      let endpoint = '/api/transactions/summary';
      if (startDateStr && endDateStr) {
        endpoint += `?startDate=${startDateStr}&endDate=${endDateStr}`;
      }
      console.log(`Fetching summary from: ${endpoint}`);
      const data = await apiRequest<Summary>('GET', endpoint);
      return data;
    },
  });
}

// Create a new transaction
export function useCreateTransaction() {
  return useMutation({
    mutationFn: async (newTransaction: Omit<Transaction, 'id'>) => {
      const data = await apiRequest<Transaction>('POST', '/api/transactions', newTransaction);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/summary'] });
    },
    onError: (error: Error) => {
      console.error('Error creating transaction:', error.message);
    },
  });
}

// Update an existing transaction
export function useUpdateTransaction() {
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Transaction> & { id: number }) => {
      const data = await apiRequest<Transaction>('PATCH', `/api/transactions/${id}`, updates);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/summary'] });
    },
    onError: (error: Error) => {
      console.error('Error updating transaction:', error.message);
    },
  });
}

// Delete a transaction
export function useDeleteTransaction() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/transactions/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/summary'] });
    },
    onError: (error: Error) => {
      console.error('Error deleting transaction:', error.message);
    },
  });
}