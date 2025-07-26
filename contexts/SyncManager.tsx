import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { ensureNotificationListenerPermission } from '../lib/NativeNotificationListener';
import { useSync } from '../contexts/SyncContext';
import { useSettings } from './SettingsContext';

export const SyncManager: React.FC = () => {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const { triggerSync } = useSync();
  const { autoFillTransactionEnabled } = useSettings();

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (autoFillTransactionEnabled) {
          await ensureNotificationListenerPermission();
        }
        triggerSync();
      }
      appState.current = nextAppState;
    };

    // Initial call on mount
    (async () => {
      if (autoFillTransactionEnabled) {
        await ensureNotificationListenerPermission();
      }
      triggerSync();
    })();

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [triggerSync, autoFillTransactionEnabled]);

  return null;
};
