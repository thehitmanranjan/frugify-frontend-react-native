import { useMemo } from 'react';
import { useSummary } from './useTransactions';
import { useLocalTransactions } from './useLocalTransactions';
import { useCategories } from './useCategories';
import type { TransactionWithCategory } from './useTransactions';
import type { LocalTransaction } from '../lib/database';

// Hook that combines server transactions with pending local transactions
export function useCombinedSummary(
  timeRange: string,
  startDateStr: string,
  endDateStr: string
) {
  // Get server data
  const serverQuery = useSummary(timeRange, startDateStr, endDateStr);
  
  // Get local pending transactions
  const localQuery = useLocalTransactions(startDateStr, endDateStr);
  
  // Get categories to map local transactions
  const { data: categories } = useCategories();

  // Combine and deduplicate
  const combinedData = useMemo(() => {
    if (!serverQuery.data) return null;

    const serverTransactions = serverQuery.data.transactions || [];
    const localTransactions = localQuery.data || [];

    // Get server IDs to avoid duplicates
    const serverIds = new Set(serverTransactions.map(tx => tx.id));

    // Provide all local transactions that aren't yet reflected in the server payload
    // This prevents them from disappearing from the UI during the sync-invalidation delay
    const unmergedLocal = localTransactions.filter(
      tx => !tx.serverId || !serverIds.has(tx.serverId)
    );

    // Convert local transactions to match server format
    const localAsServer: TransactionWithCategory[] = unmergedLocal.map(local => {
      // Find the actual category
      const category = categories?.find(cat => cat.id === local.categoryId);
      
      return {
        id: local.id || 0,
        amount: local.amount,
        date: local.date,
        description: local.description,
        categoryId: local.categoryId,
        category: category || {
          id: local.categoryId,
          name: 'Unknown',
          type: 'expense',
          icon: 'help-circle',
          color: '#999',
        },
        // Add sync status for UI
        _syncStatus: local.syncStatus,
        _localId: local.localId,
      } as any;
    });

    // We also need to graft _localId and _syncStatus onto the server transactions so UI interactions
    // can correctly interact with the local database if applicable.
    const enrichedServerTransactions = serverTransactions.map(serverTx => {
      const localMatch = localTransactions.find(local => local.serverId === serverTx.id);
      if (localMatch) {
        return {
          ...serverTx,
          _localId: localMatch.localId,
          _syncStatus: localMatch.syncStatus,
        } as any;
      }
      return serverTx;
    });

    // Combine: unmerged local transactions first, then enriched server transactions
    const allTransactions = [...localAsServer, ...enrichedServerTransactions];

    // Recalculate totals including unmerged transactions
    let income = serverQuery.data.income;
    let expense = serverQuery.data.expense;

    // Deep copy category data so we can mutate it
    const updatedCategoryData = serverQuery.data.categoryData ? [...serverQuery.data.categoryData.map(c => ({...c}))] : [];

    unmergedLocal.forEach(local => {
      const category = categories?.find(cat => cat.id === local.categoryId);
      if (category?.type === 'income') {
        income += local.amount;
      } else {
        expense += local.amount;
      }

      // Add to categoryData for the pie chart
      if (category) {
        const existingCategory = updatedCategoryData.find(c => c.id === category.id);
        if (existingCategory) {
          existingCategory.amount += local.amount;
        } else {
          updatedCategoryData.push({
            id: category.id,
            name: category.name,
            type: category.type,
            icon: category.icon,
            color: category.color,
            amount: local.amount
          });
        }
      }
    });

    return {
      ...serverQuery.data,
      income,
      expense,
      balance: income - expense,
      transactions: allTransactions,
      categoryData: updatedCategoryData,
    };
  }, [serverQuery.data, localQuery.data, categories]);

  return {
    data: combinedData,
    isLoading: serverQuery.isLoading,
    isError: serverQuery.isError,
    error: serverQuery.error,
  };
}
