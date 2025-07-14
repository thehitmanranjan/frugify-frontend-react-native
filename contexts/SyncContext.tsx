import React, { createContext, useContext, useState, useCallback } from 'react';
import { syncTransactionalMessages } from '../lib/NativeNotificationListener';

interface SyncContextType {
  syncing: boolean;
  triggerSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({
  syncing: false,
  triggerSync: async () => {},
});

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [syncing, setSyncing] = useState(false);

  const triggerSync = useCallback(async () => {
    console.log('🚀 Sync triggered from SyncContext');
    setSyncing(true);
    try {
      await syncTransactionalMessages();
      console.log('✅ Sync completed successfully');
    } catch (error) {
      console.error('❌ Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  }, []);

  return (
    <SyncContext.Provider value={{ syncing, triggerSync }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => useContext(SyncContext);
