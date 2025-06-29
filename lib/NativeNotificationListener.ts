import { NativeModules, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest, queryClient } from './apiClient';

const LINKING_ERROR =
  `The package 'frugify-notification-listener' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

interface TransactionalMessage {
  sender: string;
  message: string;
  timestamp: number; // Received as double from Java, represents milliseconds
}

interface NotificationModuleType {
  getTransactionalMessages: () => Promise<TransactionalMessage[]>;
  clearTransactionalMessages: () => Promise<void>;
  isNotificationListenerEnabled: () => Promise<boolean>;
  requestNotificationListenerPermission: () => void;
}

const NotificationModule: NotificationModuleType = NativeModules.NotificationModule
  ? (NativeModules.NotificationModule as NotificationModuleType)
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    ) as NotificationModuleType;

/**
 * Syncs transactional messages: fetches, processes, and clears them after success.
 */
export async function syncTransactionalMessages() {
  try {
    const messages = await NotificationModule.getTransactionalMessages();
    if (!messages || messages.length === 0) return;
    for (const msg of messages) {
      try {
        // Process each message via AI endpoint with source: 'message'
        await apiRequest<any>('POST', '/ai/createTransaction', { text: msg.message, source: 'message' }, undefined, true);
      } catch (err) {
        // Log and skip failed messages, do not clear
        console.error('Failed to process transactional message:', err);
        // onError logic
        if (err instanceof Error) {
          console.error('Error creating transaction from message:', err.message);
        }
        return;
      }
    }
    // If all processed, clear messages
    await NotificationModule.clearTransactionalMessages();
    // onSuccess logic (invalidate queries)
    if (typeof queryClient !== 'undefined') {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({
        queryKey: ['/api/transactions/summary'],
        exact: false
      });
    }
  } catch (err) {
    console.error('Error syncing transactional messages:', err);
    // onError logic
    if (err instanceof Error) {
      console.error('Error creating transaction from message:', err.message);
    }
  }
}

// Utility to request notification listener permission with explanation
export async function ensureNotificationListenerPermission() {
  try {
    const dontAskAgain = await AsyncStorage.getItem('dontAskNotificationPermission');
    if (dontAskAgain === 'true') {
      return; // Skip asking for permission
    }

    const enabled = await NotificationModule.isNotificationListenerEnabled();
    if (!enabled) {
      Alert.alert(
        'Permission Required',
        'Frugify needs notification access to read your transactional messages and auto-sync your transactions. Please grant notification listener permission.',
        [
          {
            text: "Don't Ask Again",
            onPress: async () => {
              await AsyncStorage.setItem('dontAskNotificationPermission', 'true');
              Alert.alert(
                'Reminder',
                'You will need to manually grant notification listener permission from the settings app.',
                [{ text: 'OK' }]
              );
            },
            style: 'destructive',
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Allow',
            onPress: () => NotificationModule.requestNotificationListenerPermission(),
          },
        ],
        { cancelable: true }
      );
    }
  } catch (err) {
    // fallback: just try to request
    NotificationModule.requestNotificationListenerPermission();
  }
}

export default NotificationModule;
export type { TransactionalMessage };
