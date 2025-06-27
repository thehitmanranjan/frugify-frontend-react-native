import { NativeModules, Platform } from 'react-native';

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
