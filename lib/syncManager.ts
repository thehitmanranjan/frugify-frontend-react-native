import { database, LocalTransaction } from './database';
import { apiRequest } from './apiClient';
import { queryClient } from './apiClient';
import NetInfo from '@react-native-community/netinfo';

class SyncManager {
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private listeners: Set<() => void> = new Set();
  private netInfoUnsubscribe: (() => void) | null = null;

  // Start background sync
  startBackgroundSync(intervalMs: number = 30000) {
    if (this.syncInterval) return;

    // Delay initial sync to allow database to initialize
    setTimeout(() => {
      this.syncPendingTransactions();
    }, 3000); // Wait 3 seconds before first sync

    // Periodic sync
    this.syncInterval = setInterval(() => {
      this.syncPendingTransactions();
    }, intervalMs);

    // Sync when network becomes available
    if (!this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe = NetInfo.addEventListener(state => {
        if (state.isConnected && !this.isSyncing) {
          setTimeout(() => {
            this.syncPendingTransactions();
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
          // Sync to server
          const serverTransaction = await apiRequest<any>(
            'POST',
            '/api/transactions',
            {
              amount: transaction.amount,
              date: transaction.date,
              description: transaction.description,
              categoryId: transaction.categoryId,
            }
          );

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
