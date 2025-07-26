import React, { createContext, useContext, useState, useCallback } from 'react';
import { syncTransactionalMessages } from '../lib/NativeNotificationListener';
import { useSettings } from './SettingsContext';

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
  const { autoFillTransactionEnabled } = useSettings();

  const triggerSync = useCallback(async () => {
    // Only sync if auto-fill transaction is enabled
    if (!autoFillTransactionEnabled) {
      return;
    }

    setSyncing(true);
    try {
      await syncTransactionalMessages();
    } finally {
      setSyncing(false);
    }
  }, [autoFillTransactionEnabled]);

  return (
    <SyncContext.Provider value={{ syncing, triggerSync }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => useContext(SyncContext);
