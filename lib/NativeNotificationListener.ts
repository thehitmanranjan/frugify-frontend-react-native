import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'frugify-notification-listener' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

interface TransactionalMessage {
  id: string; // Added
  sender: string;
  message: string;
  timestamp: number; // Received as double from Java, represents milliseconds
  status: string; // Added (e.g., "unprocessed", "processing")
}

interface NotificationModuleType {
  // Renamed from getTransactionalMessages
  getMessagesForDisplay: () => Promise<TransactionalMessage[]>;

  // New methods for backend sync
  getUnprocessedMessagesForBackend: () => Promise<TransactionalMessage[]>;
  markMessageAsProcessing: (messageId: string) => Promise<void>;
  deleteProcessedMessage: (messageId: string) => Promise<void>;

  // Existing permission methods
  isNotificationListenerEnabled: () => Promise<boolean>;
  requestNotificationListenerPermission: () => void;

  // clearTransactionalMessages might be removed or re-purposed if needed
  // For now, let's assume it's not directly available or needed with the new flow.
  // If a "clear all from UI" or "clear from SharedPreferences" is needed,
  // it would be a new method like clearAllStoredMessages().
}

const NotificationModule = NativeModules.NotificationModule
  ? (NativeModules.NotificationModule as NotificationModuleType)
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

export default NotificationModule;
export type { TransactionalMessage };
