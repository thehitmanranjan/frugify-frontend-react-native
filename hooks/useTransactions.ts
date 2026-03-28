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
      queryClient.invalidateQueries({
        queryKey: ['/api/transactions/summary'],
        exact: false // This will match all keys that start with this prefix
      });
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
      queryClient.invalidateQueries({
        queryKey: ['/api/transactions/summary'],
        exact: false // This will match all keys that start with this prefix
      });
    },
    onError: (error: Error) => {
      console.error('Error updating transaction:', error.message);
    },
  });
}

export function useDeleteTransaction() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/transactions/${id}`);
      return id;
    },
    onMutate: async (id: number) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/transactions/summary'] });

      // Snapshot the previous value
      const previousSummary = queryClient.getQueryData(['/api/transactions/summary']);

      // Optimistically update the summary cache to instantly hide it
      queryClient.setQueriesData({ queryKey: ['/api/transactions/summary'] }, (oldData: any) => {
        if (!oldData) return oldData;
        const txToDelete = oldData.transactions?.find((t: any) => t.id === id);
        
        let newIncome = oldData.income || 0;
        let newExpense = oldData.expense || 0;
        let newCategoryData = oldData.categoryData ? [...oldData.categoryData] : [];

        if (txToDelete) {
          if (txToDelete.category?.type === 'income') {
            newIncome -= txToDelete.amount;
          } else {
            newExpense -= txToDelete.amount;
          }

          const catIndex = newCategoryData.findIndex((c: any) => c.id === txToDelete.categoryId);
          if (catIndex >= 0) {
            newCategoryData[catIndex] = { ...newCategoryData[catIndex] };
            newCategoryData[catIndex].amount -= txToDelete.amount;
            if (newCategoryData[catIndex].amount <= 0) {
              newCategoryData.splice(catIndex, 1);
            }
          }
        }

        return {
          ...oldData,
          income: newIncome,
          expense: newExpense,
          balance: newIncome - newExpense,
          categoryData: newCategoryData,
          transactions: oldData.transactions?.filter((t: any) => t.id !== id) || [],
        };
      });

      return { previousSummary };
    },
    onError: (error: Error, id, context) => {
      console.error('Error deleting transaction:', error.message);
      // Rollback on failure
      if (context?.previousSummary) {
        queryClient.setQueriesData({ queryKey: ['/api/transactions/summary'] }, context.previousSummary);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({
        queryKey: ['/api/transactions/summary'],
        exact: false 
      });
    },
  });
}