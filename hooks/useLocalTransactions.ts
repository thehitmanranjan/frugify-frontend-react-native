import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { database, LocalTransaction } from '../lib/database';
import { syncManager } from '../lib/syncManager';
import { useEffect, useState } from 'react';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { apiRequest } from '../lib/apiClient';
// Hook to get transactions from local database
export function useLocalTransactions(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['local-transactions', startDate, endDate],
    queryFn: async () => {
      const transactions = await database.getTransactionsByDateRange(startDate, endDate);
      return transactions;
    },
    staleTime: 0, // Always fetch fresh data
  });
}

// Hook to create transaction locally (optimistic)
export function useCreateLocalTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newTransaction: {
      amount: number;
      date: string;
      description?: string;
      categoryId: number;
    }) => {
      const localId = uuidv4();
      const now = Date.now();

      const transaction: Omit<LocalTransaction, 'id'> = {
        localId,
        amount: newTransaction.amount,
        date: newTransaction.date,
        description: newTransaction.description,
        categoryId: newTransaction.categoryId,
        syncStatus: 'pending',
        createdAt: now,
        updatedAt: now,
      };

      const created = await database.addTransaction(transaction);
      
      // Trigger background sync immediately
      syncManager.syncPendingTransactions();

      return created;
    },
    onSuccess: () => {
      // Invalidate local queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['local-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['local-summary'] });
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
    },
    onError: (error: Error) => {
      console.error('Error creating local transaction:', error.message);
    },
  });
}

// Hook to update transaction locally
export function useUpdateLocalTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      localId,
      updates,
    }: {
      localId: string;
      updates: Partial<LocalTransaction>;
    }) => {
      await database.updateTransaction(localId, {
        ...updates,
        syncStatus: 'pending', // Mark as pending for re-sync
      });

      // Trigger background sync
      syncManager.syncPendingTransactions();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['local-summary'] });
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
    },
    onError: (error: Error) => {
      console.error('Error updating local transaction:', error.message);
    },
  });
}

// Hook to delete transaction locally
export function useDeleteLocalTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (localId: string) => {
      const transaction = await database.getTransaction(localId);
      
      if (transaction?.serverId) {
        // Asynchronously delete from backend, fire-and-forget
        apiRequest('DELETE', `/api/transactions/${transaction.serverId}`).catch((err) => {
          console.error('Failed to remotely delete transaction:', err);
        });

        // Optimistically remove the remote transaction from the React Query cache instantly!
        queryClient.setQueriesData({ queryKey: ['/api/transactions/summary'] }, (oldData: any) => {
          if (!oldData) return oldData;
          const txToDelete = oldData.transactions?.find((t: any) => t.id === transaction.serverId);
          
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
            transactions: oldData.transactions?.filter((t: any) => t.id !== transaction.serverId) || [],
          };
        });
      }

      // Automatically delete locally
      if (transaction || localId) {
        await database.deleteTransaction(localId);
      }
      return localId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['local-summary'] });
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/summary'], exact: false });
    },
    onError: (error: Error) => {
      console.error('Error deleting local transaction:', error.message);
    },
  });
}

// Hook to get sync status
export function useSyncStatus() {
  const [status, setStatus] = useState({ pending: 0, errors: 0, synced: 0 });

  useEffect(() => {
    const updateStatus = async () => {
      const syncStatus = await syncManager.getSyncStatus();
      setStatus(syncStatus);
    };

    updateStatus();
    const unsubscribe = syncManager.subscribe(updateStatus);

    return () => {
      unsubscribe();
    };
  }, []);

  return status;
}

// Hook to retry failed syncs
export function useRetrySync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (localId: string) => {
      await syncManager.retrySyncTransaction(localId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
    },
  });
}

// Hook to get local summary (similar to useSummary but from local DB)
export function useLocalSummary(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['local-summary', startDate, endDate],
    queryFn: async () => {
      const transactions = await database.getTransactionsByDateRange(startDate, endDate);
      const categories = await database.getCategories();

      // Calculate summary
      let income = 0;
      let expense = 0;
      const categoryMap = new Map<number, {
        id: number;
        name: string;
        type: string;
        icon: string;
        color: string;
        amount: number;
      }>();

      for (const transaction of transactions) {
        const category = categories.find(c => c.id === transaction.categoryId);
        if (!category) continue;

        if (category.type === 'income') {
          income += transaction.amount;
        } else {
          expense += transaction.amount;
        }

        const existing = categoryMap.get(category.id);
        if (existing) {
          existing.amount += transaction.amount;
        } else {
          categoryMap.set(category.id, {
            id: category.id,
            name: category.name,
            type: category.type,
            icon: category.icon,
            color: category.color,
            amount: transaction.amount,
          });
        }
      }

      return {
        income,
        expense,
        balance: income - expense,
        categoryData: Array.from(categoryMap.values()),
        transactions: transactions.map(t => {
          const category = categories.find(c => c.id === t.categoryId);
          return {
            ...t,
            category: category!,
          };
        }),
      };
    },
    staleTime: 0,
  });
}
