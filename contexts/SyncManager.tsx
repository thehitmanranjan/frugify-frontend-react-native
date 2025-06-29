import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { ensureNotificationListenerPermission } from '../lib/NativeNotificationListener';
import { useSync } from '../contexts/SyncContext';

export const SyncManager: React.FC = () => {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const { triggerSync } = useSync();

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        await ensureNotificationListenerPermission();
        triggerSync();
      }
      appState.current = nextAppState;
    };

    // Initial call on mount
    (async () => {
      await ensureNotificationListenerPermission();
      triggerSync();
    })();

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [triggerSync]);

  return null;
};
