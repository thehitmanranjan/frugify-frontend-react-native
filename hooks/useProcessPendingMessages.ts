import { useEffect, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import NativeNotificationListener, { TransactionalMessage } from '../lib/NativeNotificationListener';
import { useCreateTransactionFromSpeech } from './useCreateTransactionFromSpeech';
import { useAuth } from '../contexts/AuthContext'; // To ensure user is authenticated

export function useProcessPendingMessages() {
  const { isAuthenticated } = useAuth();
  const { mutateAsync: createTransaction, isLoading: isCreatingTransaction } = useCreateTransactionFromSpeech();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  const processMessages = useCallback(async () => {
    if (!isAuthenticated || isProcessing) {
      console.log('ProcessMessages: Skipping, not authenticated or already processing.');
      return;
    }

    console.log('ProcessMessages: Checking for permission and messages...');
    let hasPermission = false;
    try {
      hasPermission = await NativeNotificationListener.isNotificationListenerEnabled();
    } catch (error) {
      console.error('ProcessMessages: Error checking notification permission:', error);
      setProcessingError('Failed to check notification permission.');
      return;
    }

    if (!hasPermission) {
      console.log('ProcessMessages: Notification permission not granted. Skipping.');
      // No error set here as it's a permission issue, not a processing failure.
      return;
    }

    setIsProcessing(true);
    setProcessingError(null);
    let unprocessedMessages: TransactionalMessage[] = [];

    try {
      console.log('ProcessMessages: Fetching unprocessed messages for backend...');
      unprocessedMessages = await NativeNotificationListener.getUnprocessedMessagesForBackend();
    } catch (error) {
      console.error('ProcessMessages: Error fetching messages from native module:', error);
      setProcessingError('Failed to fetch messages for processing.');
      setIsProcessing(false);
      return;
    }

    if (unprocessedMessages.length === 0) {
      console.log('ProcessMessages: No unprocessed messages found.');
      setIsProcessing(false);
      return;
    }

    console.log(`ProcessMessages: Found ${unprocessedMessages.length} messages to process.`);

    for (const msg of unprocessedMessages) {
      try {
        console.log(`ProcessMessages: Processing message ID ${msg.id}: "${msg.message}"`);
        // Optional: Mark as "processing" if you want to ensure it's not picked up by another run
        // await NativeNotificationListener.markMessageAsProcessing(msg.id);

        // Use the sender and message content. Adjust if the API needs more specific formatting.
        // For example, some APIs might prefer "Sender: Message" or just the message.
        // The current useCreateTransactionFromSpeech hook takes a single string.
        // Let's try combining sender and message for more context, if appropriate.
        // Or, if the backend is trained for it, just the message might be enough.
        // For now, using just the message text as per current hook.
        const textToProcess = `${msg.sender}: ${msg.message}`; // Or just msg.message

        await createTransaction(textToProcess); // Pass the message text

        console.log(`ProcessMessages: Successfully processed message ID ${msg.id}. Deleting from native store.`);
        await NativeNotificationListener.deleteProcessedMessage(msg.id);
      } catch (error: any) {
        console.error(`ProcessMessages: Error processing message ID ${msg.id}:`, error);
        // Decide on error strategy:
        // 1. Stop processing further messages in this batch.
        // 2. Continue with next message (current implementation).
        // 3. Mark message as "failed" in native store (requires status update in native).
        setProcessingError(`Failed to process message ID ${msg.id}: ${error.message || 'Unknown error'}`);
        // If one fails, we might want to stop to avoid flooding backend or repeated errors
        // break; // Uncomment to stop on first error
      }
    }

    console.log('ProcessMessages: Finished processing batch.');
    setIsProcessing(false);
  }, [isAuthenticated, createTransaction, isProcessing]);

  useEffect(() => {
    // Run on initial mount if authenticated
    if (isAuthenticated) {
      console.log('ProcessMessages Hook: Initial run on mount.');
      processMessages();
    }

    // Listen for app state changes to run when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && isAuthenticated) {
        console.log('ProcessMessages Hook: App came to foreground, triggering process.');
        processMessages();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [processMessages, isAuthenticated]);

  return { isProcessing, processingError, triggerProcessing: processMessages };
}
