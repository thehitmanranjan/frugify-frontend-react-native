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
    console.log('🔄 Starting sync of transactional messages...');
    const messages = await NotificationModule.getTransactionalMessages();
    
    if (!messages || messages.length === 0) {
      console.log('📭 No transactional messages to sync');
      return;
    }
    
    console.log(`📱 Found ${messages.length} transactional message(s) to sync:`);
    messages.forEach((msg, index) => {
      const date = new Date(msg.timestamp);
      console.log(`📝 Message ${index + 1}:`);
      console.log(`   📤 Sender: ${msg.sender}`);
      console.log(`   💬 Message: ${msg.message}`);
      console.log(`   🕐 Timestamp: ${date.toLocaleString()}`);
      console.log(`   ⏱️  Raw timestamp: ${msg.timestamp}`);
    });
    
    for (const msg of messages) {
      try {
        console.log(`🤖 Processing message from ${msg.sender}...`);
        // Process each message via AI endpoint with source: 'message'
        await apiRequest<any>('POST', '/ai/createTransaction', { text: msg.message, source: 'message' }, undefined, true);
        console.log(`✅ Successfully processed message from ${msg.sender}`);
      } catch (err) {
        // Log and skip failed messages, do not clear
        console.error('❌ Failed to process transactional message:', err);
        // onError logic
        if (err instanceof Error) {
          console.error('Error creating transaction from message:', err.message);
        }
        return;
      }
    }
    // If all processed, clear messages
    console.log('🧹 All messages processed successfully, clearing message queue...');
    await NotificationModule.clearTransactionalMessages();
    console.log('✨ Message queue cleared');
    
    // onSuccess logic (invalidate queries)
    if (typeof queryClient !== 'undefined') {
      console.log('🔄 Invalidating transaction queries...');
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({
        queryKey: ['/api/transactions/summary'],
        exact: false
      });
      console.log('✅ Queries invalidated, UI will refresh with new data');
    }
  } catch (err) {
    console.error('💥 Error syncing transactional messages:', err);
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

/**
 * Debug function to check stored transactional messages without processing them
 */
export async function debugCheckStoredMessages() {
  try {
    console.log('🔍 Checking stored transactional messages...');
    const messages = await NotificationModule.getTransactionalMessages();
    
    if (!messages || messages.length === 0) {
      console.log('📭 No messages currently stored');
      return [];
    }
    
    console.log(`📱 Found ${messages.length} stored message(s):`);
    messages.forEach((msg, index) => {
      const date = new Date(msg.timestamp);
      console.log(`📝 Message ${index + 1}:`);
      console.log(`   📤 Sender: ${msg.sender}`);
      console.log(`   💬 Message: ${msg.message}`);
      console.log(`   🕐 Timestamp: ${date.toLocaleString()}`);
      console.log(`   ⏱️  Raw timestamp: ${msg.timestamp}`);
      console.log('   ---');
    });
    
    return messages;
  } catch (err) {
    console.error('❌ Error checking stored messages:', err);
    return [];
  }
}

export default NotificationModule;
export type { TransactionalMessage };
