import { database, LocalTransaction, LocalBudget } from './database';
import { apiRequest } from './apiClient';
import { queryClient } from './apiClient';
import NetInfo from '@react-native-community/netinfo';

class SyncManager {
  private isSyncing = false;
  private isSyncingBudgets = false;
  private isFetchingBudgets = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private listeners: Set<() => void> = new Set();
  private netInfoUnsubscribe: (() => void) | null = null;

  // Start background sync
  startBackgroundSync(intervalMs: number = 30000) {
    if (this.syncInterval) return;

    // Delay initial sync to allow database to initialize
    setTimeout(() => {
      this.syncPendingTransactions();
      this.syncPendingBudgets();
      this.fetchRemoteBudgets();
    }, 3000); // Wait 3 seconds before first sync

    // Periodic sync
    this.syncInterval = setInterval(() => {
      this.syncPendingTransactions();
      this.syncPendingBudgets();
    }, intervalMs);

    // Sync when network becomes available
    if (!this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe = NetInfo.addEventListener(state => {
        if (state.isConnected && !this.isSyncing) {
          setTimeout(() => {
            this.syncPendingTransactions();
            this.syncPendingBudgets();
            this.fetchRemoteBudgets();
          }, 1000); // Small delay when network reconnects
        }
      });
    }
  }

  stopBackgroundSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }
  }

  // Subscribe to sync status changes
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  // ─── Transaction Sync ────────────────────────────────────────────────────────

  async syncPendingTransactions(): Promise<void> {
    if (this.isSyncing) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    this.isSyncing = true;
    
    try {
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        console.log('No internet connection, skipping sync');
        return;
      }

      console.log('Starting transaction sync...');

      const pending = await database.getPendingTransactions();
      
      if (pending.length === 0) {
        console.log('No pending transactions to sync');
        this.isSyncing = false;
        return;
      }
      
      console.log(`Found ${pending.length} pending transactions`);

      for (const transaction of pending) {
        try {
          let serverTransaction;
          
          if (transaction.serverId) {
            // Update existing transaction on server
            serverTransaction = await apiRequest<any>(
              'PATCH',
              `/api/transactions/${transaction.serverId}`,
              {
                amount: transaction.amount,
                date: transaction.date,
                description: transaction.description,
                categoryId: transaction.categoryId,
              }
            );
          } else {
            // Create new transaction on server
            serverTransaction = await apiRequest<any>(
              'POST',
              '/api/transactions',
              {
                amount: transaction.amount,
                date: transaction.date,
                description: transaction.description,
                categoryId: transaction.categoryId,
              }
            );
          }

          // Update local record with server ID and mark as synced
          await database.updateTransaction(transaction.localId, {
            serverId: serverTransaction.id,
            syncStatus: 'synced',
            errorMessage: undefined,
          });

          console.log(`Synced transaction ${transaction.localId} -> server ID ${serverTransaction.id}`);
        } catch (error) {
          // Mark as error but don't stop syncing other transactions
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          await database.updateTransaction(transaction.localId, {
            syncStatus: 'error',
            errorMessage,
          });
          console.error(`Failed to sync transaction ${transaction.localId}:`, errorMessage);
        }
      }

      // Invalidate React Query cache to refresh UI
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({
        queryKey: ['/api/transactions/summary'],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: ['local-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['local-summary'] });

      this.notifyListeners();
    } catch (error) {
      console.error('Error during sync:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  // ─── Budget Sync ─────────────────────────────────────────────────────────────

  async syncPendingBudgets(): Promise<void> {
    if (this.isSyncingBudgets) {
      console.log('Budget sync already in progress, skipping...');
      return;
    }

    this.isSyncingBudgets = true;

    try {
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        console.log('No internet connection, skipping budget sync');
        return;
      }

      console.log('Starting budget sync...');

      const pending = await database.getPendingBudgets();

      if (pending.length === 0) {
        console.log('No pending budgets to sync');
        this.isSyncingBudgets = false;
        return;
      }

      console.log(`Found ${pending.length} pending budgets`);

      for (const budget of pending) {
        try {
          const action = budget.pendingAction || 'create';

          if (action === 'delete' && budget.serverId) {
            // Delete from server
            await apiRequest<any>(
              'DELETE',
              `/api/budgets/${budget.serverId}`
            );

            // Remove from local DB after successful server delete
            await database.deleteBudget(budget.localId);
            console.log(`Deleted budget ${budget.localId} from server (ID: ${budget.serverId})`);

          } else if (action === 'update' && budget.serverId) {
            // Update existing budget on server
            const serverBudget = await apiRequest<any>(
              'PUT',
              `/api/budgets/${budget.serverId}`,
              {
                amount: budget.amount,
                month: budget.month,
                year: budget.year,
                categoryId: budget.categoryId,
              }
            );

            await database.updateBudget(budget.localId, {
              serverId: serverBudget.id,
              syncStatus: 'synced',
              pendingAction: undefined,
              errorMessage: undefined,
            });

            console.log(`Updated budget ${budget.localId} -> server ID ${serverBudget.id}`);

          } else if (action === 'create') {
            // Create new budget on server
            const serverBudget = await apiRequest<any>(
              'POST',
              '/api/budgets',
              {
                amount: budget.amount,
                month: budget.month,
                year: budget.year,
                categoryId: budget.categoryId,
              }
            );

            await database.updateBudget(budget.localId, {
              serverId: serverBudget.id,
              syncStatus: 'synced',
              pendingAction: undefined,
              errorMessage: undefined,
            });

            console.log(`Created budget ${budget.localId} -> server ID ${serverBudget.id}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          await database.updateBudget(budget.localId, {
            syncStatus: 'error',
            errorMessage,
          });
          console.error(`Failed to sync budget ${budget.localId}:`, errorMessage);
        }
      }

      // Invalidate React Query cache to refresh budget UI
      queryClient.invalidateQueries({ queryKey: ['/api/budgets'] });
      queryClient.invalidateQueries({ queryKey: ['local-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['local-budgets-all'] });

      this.notifyListeners();
    } catch (error) {
      console.error('Error during budget sync:', error);
    } finally {
      this.isSyncingBudgets = false;
    }
  }

  /**
   * Fetch all remote budgets and sync them down to the local SQLite database.
   * This is a "pull" operation — it ensures local DB has the latest server data.
   */
  async fetchRemoteBudgets(): Promise<void> {
    if (this.isFetchingBudgets) {
      console.log('Budget fetch already in progress, skipping...');
      return;
    }

    this.isFetchingBudgets = true;
    try {
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) return;

      console.log('Fetching remote budgets for local sync...');

      const remoteBudgets = await apiRequest<Array<{
        id: number;
        amount: number;
        month: number;
        year: number;
        categoryId: number | null;
        userId?: number;
        createdAt?: string;
      }>>('GET', '/api/budgets');

      if (!remoteBudgets || !Array.isArray(remoteBudgets)) {
        console.log('No remote budgets found or invalid response');
        return;
      }

      console.log(`Fetched ${remoteBudgets.length} remote budgets, syncing to local DB...`);

      for (const remoteBudget of remoteBudgets) {
        await database.upsertBudgetFromServer({
          id: remoteBudget.id,
          amount: remoteBudget.amount,
          month: remoteBudget.month,
          year: remoteBudget.year,
          categoryId: remoteBudget.categoryId,
        });
      }

      // Refresh local budget queries
      queryClient.invalidateQueries({ queryKey: ['local-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['local-budgets-all'] });

      this.notifyListeners();
      console.log('Remote budgets synced to local DB successfully');
    } catch (error) {
      console.error('Error fetching remote budgets:', error);
    } finally {
      this.isFetchingBudgets = false;
    }
  }

  // ─── Retry & Status ──────────────────────────────────────────────────────────

  async retrySyncTransaction(localId: string): Promise<void> {
    const transaction = await database.getTransaction(localId);
    if (!transaction) return;

    // Reset to pending
    await database.updateTransaction(localId, {
      syncStatus: 'pending',
      errorMessage: undefined,
    });

    // Trigger sync
    await this.syncPendingTransactions();
  }

  async retrySyncBudget(localId: string): Promise<void> {
    const budget = await database.getBudget(localId);
    if (!budget) return;

    await database.updateBudget(localId, {
      syncStatus: 'pending',
      errorMessage: undefined,
    });

    await this.syncPendingBudgets();
  }

  async getSyncStatus(): Promise<{
    pending: number;
    errors: number;
    synced: number;
  }> {
    const pending = await database.getPendingTransactions();
    const errors = await database.getErrorTransactions();
    
    return {
      pending: pending.length,
      errors: errors.length,
      synced: 0, // Could calculate if needed
    };
  }
}

export const syncManager = new SyncManager();
