import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { database, LocalBudget } from '../lib/database';
import { syncManager } from '../lib/syncManager';
import { apiRequest } from '../lib/apiClient';
import { useEffect, useState } from 'react';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Budget {
  id: number;
  amount: number;
  month: number;
  year: number;
  categoryId: number | null;
  userId?: number;
  createdAt?: string;
}

// ─── Local Budget Queries (Offline-First) ────────────────────────────────────

/**
 * Hook to get budgets for a specific month/year from local SQLite DB
 */
export function useLocalBudgets(month: number, year: number) {
  return useQuery({
    queryKey: ['local-budgets', month, year],
    queryFn: async () => {
      const budgets = await database.getBudgetsByMonthYear(month, year);
      return budgets;
    },
    staleTime: 0, // Always fetch fresh data
  });
}

/**
 * Hook to get all budgets from local DB
 */
export function useAllLocalBudgets() {
  return useQuery({
    queryKey: ['local-budgets-all'],
    queryFn: async () => {
      const budgets = await database.getAllBudgets();
      return budgets;
    },
    staleTime: 0,
  });
}

// ─── Local Budget Mutations ──────────────────────────────────────────────────

/**
 * Hook to create a budget locally (optimistic, offline-first)
 */
export function useCreateLocalBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newBudget: {
      amount: number;
      month: number;
      year: number;
      categoryId: number | null;
    }) => {
      // Check for duplicate (month + year + category combination)
      const existing = await database.getBudgetByMonthYearCategory(
        newBudget.month,
        newBudget.year,
        newBudget.categoryId
      );

      if (existing) {
        throw new Error(
          newBudget.categoryId === null
            ? `An overall budget already exists for ${newBudget.month}/${newBudget.year}`
            : `A budget for this category already exists for ${newBudget.month}/${newBudget.year}`
        );
      }

      const localId = uuidv4();
      const now = Date.now();

      const budget: Omit<LocalBudget, 'id'> = {
        localId,
        amount: newBudget.amount,
        month: newBudget.month,
        year: newBudget.year,
        categoryId: newBudget.categoryId,
        syncStatus: 'pending',
        pendingAction: 'create',
        createdAt: now,
        updatedAt: now,
      };

      const created = await database.addBudget(budget);

      // Trigger background sync immediately
      syncManager.syncPendingBudgets();

      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['local-budgets-all'] });
    },
    onError: (error: Error) => {
      console.error('Error creating local budget:', error.message);
    },
  });
}

/**
 * Hook to update a budget locally (optimistic)
 */
export function useUpdateLocalBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      localId,
      serverId,
      updates,
    }: {
      localId?: string;
      serverId?: number;
      updates: Partial<LocalBudget>;
    }) => {
      let targetLocalId = localId;

      if (!targetLocalId && serverId) {
        // Server-only budget being edited locally for the first time
        const existing = await database.getBudgetByServerId(serverId);
        if (existing) {
          targetLocalId = existing.localId;
          await database.updateBudget(targetLocalId, {
            ...updates,
            syncStatus: 'pending',
            pendingAction: 'update',
          });
        }
      } else if (targetLocalId) {
        const existing = await database.getBudget(targetLocalId);
        await database.updateBudget(targetLocalId, {
          ...updates,
          syncStatus: 'pending',
          // If it was never synced (create), keep it as create; otherwise mark update
          pendingAction: existing?.serverId ? 'update' : 'create',
        });
      }

      // Trigger background sync
      syncManager.syncPendingBudgets();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['local-budgets-all'] });
    },
    onError: (error: Error) => {
      console.error('Error updating local budget:', error.message);
    },
  });
}

/**
 * Hook to delete a budget locally (optimistic)
 */
export function useDeleteLocalBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (localId: string) => {
      const budget = await database.getBudget(localId);

      if (budget?.serverId) {
        // Mark for deletion sync, then fire-and-forget the remote delete
        await database.updateBudget(localId, {
          syncStatus: 'pending',
          pendingAction: 'delete',
        });

        // Also optimistically delete remotely
        apiRequest('DELETE', `/api/budgets/${budget.serverId}`).then(() => {
          // After successful remote delete, remove locally
          database.deleteBudget(localId);
          queryClient.invalidateQueries({ queryKey: ['local-budgets'] });
          queryClient.invalidateQueries({ queryKey: ['local-budgets-all'] });
        }).catch((err) => {
          console.error('Failed to remotely delete budget:', err);
          // SyncManager will retry on next cycle
        });
      } else {
        // Never synced to server, just remove locally
        await database.deleteBudget(localId);
      }

      return localId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['local-budgets-all'] });
    },
    onError: (error: Error) => {
      console.error('Error deleting local budget:', error.message);
    },
  });
}

// ─── Remote API Queries (for direct fetch when online) ───────────────────────

/**
 * Hook to fetch budgets from the remote API
 */
export function useRemoteBudgets() {
  return useQuery({
    queryKey: ['/api/budgets'],
    queryFn: async () => {
      const data = await apiRequest<Budget[]>('GET', '/api/budgets');
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ─── Budget Sync Status ──────────────────────────────────────────────────────

/**
 * Hook to track budget sync status
 */
export function useBudgetSyncStatus() {
  const [status, setStatus] = useState({ pending: 0, errors: 0 });

  useEffect(() => {
    const updateStatus = async () => {
      try {
        const pending = await database.getPendingBudgets();
        const errors = pending.filter(b => b.syncStatus === 'error');
        setStatus({
          pending: pending.length,
          errors: errors.length,
        });
      } catch {
        // DB might not be ready yet
      }
    };

    updateStatus();
    const unsubscribe = syncManager.subscribe(updateStatus);

    return () => {
      unsubscribe();
    };
  }, []);

  return status;
}
