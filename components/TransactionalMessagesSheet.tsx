import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking, AppState } from 'react-native';
import { Modal, Portal, PaperProvider, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import NotificationModule, { TransactionalMessage } from '../lib/NativeNotificationListener';
import { useTheme } from '../contexts/ThemeContext';
import { format } from 'date-fns';

interface TransactionalMessagesSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

const TransactionalMessagesSheet: React.FC<TransactionalMessagesSheetProps> = ({ isVisible, onClose }) => {
  const { theme } = useTheme();
  const [messages, setMessages] = useState<TransactionalMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  const checkPermission = useCallback(async () => {
    try {
      const enabled = await NotificationModule.isNotificationListenerEnabled();
      setPermissionGranted(enabled);
      return enabled;
    } catch (error) {
      console.error("Error checking notification listener permission:", error);
      setPermissionGranted(false);
      return false;
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!permissionGranted) {
      setMessages([]);
      return;
    }
    setLoading(true);
    try {
      const fetchedMessages = await NotificationModule.getTransactionalMessages();
      // Sort messages by timestamp descending (newest first)
      fetchedMessages.sort((a, b) => b.timestamp - a.timestamp);
      setMessages(fetchedMessages);
    } catch (error) {
      console.error("Error fetching transactional messages:", error);
      setMessages([]); // Clear messages on error
    } finally {
      setLoading(false);
    }
  }, [permissionGranted]);

  useEffect(() => {
    const performInitialCheck = async () => {
      await checkPermission();
      setInitialCheckDone(true);
    };
    performInitialCheck();

    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        console.log("App came to foreground, checking permission again.");
        checkPermission().then(enabled => {
          if (enabled && isVisible) { // Fetch messages if permission now granted and sheet is open
            fetchMessages();
          }
        });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [checkPermission, fetchMessages, isVisible]);

  useEffect(() => {
    if (isVisible && initialCheckDone) {
      if (permissionGranted) {
        fetchMessages();
      } else {
        setMessages([]); // Clear messages if permission not granted
      }
    }
  }, [isVisible, permissionGranted, fetchMessages, initialCheckDone]);

  const requestPermission = () => {
    NotificationModule.requestNotificationListenerPermission();
    // User will be taken to settings. They need to manually return to the app.
    // We will re-check permission when app becomes active.
  };

  const truncateMessage = (message: string, maxLength = 100) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  const renderItem = ({ item }: { item: TransactionalMessage }) => (
    <View style={[styles.itemContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.itemHeader}>
        <Text style={[styles.sender, { color: theme.colors.primary }]}>{item.sender}</Text>
        <Text style={[styles.timestamp, { color: theme.colors.placeholder }]}>
          {format(new Date(item.timestamp), 'MMM d, HH:mm')}
        </Text>
      </View>
      <Text style={[styles.message, { color: theme.colors.text }]}>{truncateMessage(item.message)}</Text>
    </View>
  );

  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      {!initialCheckDone || loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} />
      ) : !permissionGranted ? (
        <>
          <MaterialCommunityIcons name="bell-cancel-outline" size={48} color={theme.colors.placeholder} />
          <Text style={[styles.emptyText, { color: theme.colors.text }]}>
            Notification Listener permission is required to display transactional messages.
          </Text>
          <Button
            mode="contained"
            onPress={requestPermission}
            style={{ marginTop: 20, backgroundColor: theme.colors.primary }}
            labelStyle={{ color: theme.colors.surface }}
          >
            Grant Permission
          </Button>
          <Text style={[styles.emptySubText, { color: theme.colors.placeholder }]}>
            You will be redirected to system settings. Please enable access for Frugify.
          </Text>
        </>
      ) : (
        <>
          <MaterialCommunityIcons name="email-outline" size={48} color={theme.colors.placeholder} />
          <Text style={[styles.emptyText, { color: theme.colors.text }]}>No transactional messages collected yet.</Text>
          <Text style={[styles.emptySubText, { color: theme.colors.placeholder }]}>
            Messages from apps like Google Messages, WhatsApp, Telegram, and banking apps will appear here once received.
          </Text>
        </>
      )}
    </View>
  );

  return (
    <Portal>
      <Modal
        visible={isVisible}
        onDismiss={onClose}
        contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Transactional Messages</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
        {initialCheckDone && permissionGranted && (
            <TouchableOpacity onPress={fetchMessages} style={[styles.refreshButton, { borderColor: theme.colors.primary }]}>
                <MaterialCommunityIcons name="refresh" size={20} color={theme.colors.primary} style={{marginRight: 5}} />
                <Text style={{color: theme.colors.primary}}>Refresh</Text>
            </TouchableOpacity>
        )}
        <FlatList
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.timestamp}-${index}`}
          ListEmptyComponent={ListEmptyComponent}
          contentContainerStyle={messages.length === 0 ? styles.emptyListContainer : styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    flex: 1, // Make it take full height or a large portion
    // margin: 20, // Optional: if you don't want full screen
    // borderRadius: 10, // Optional
    paddingHorizontal: 0, // Remove horizontal padding to allow full-width items
    paddingVertical: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    // borderBottomColor: '#eee', // Theme controlled
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 5,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginHorizontal: 20,
    marginVertical: 10,
    borderWidth: 1,
    borderRadius: 5,
  },
  listContainer: {
    paddingHorizontal: 15, // Add padding for items if modalContent has 0
    paddingBottom: 20,
  },
  itemContainer: {
    // backgroundColor: 'white', // Theme controlled
    padding: 15,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    // borderColor: '#e0e0e0', // Theme controlled
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sender: {
    fontSize: 16,
    fontWeight: 'bold',
    // color: '#007bff', // Theme controlled
  },
  timestamp: {
    fontSize: 12,
    // color: '#666', // Theme controlled
  },
  message: {
    fontSize: 14,
    // color: '#333', // Theme controlled
    lineHeight: 20,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 300, // Ensure it takes some space
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    textAlign: 'center',
    // color: '#333', // Theme controlled
  },
  emptySubText: {
    marginTop: 8,
    fontSize: 13,
    textAlign: 'center',
    // color: '#666', // Theme controlled
  },
});

// Wrap with PaperProvider if not already at the root
// const ProvidedTransactionalMessagesSheet: React.FC<TransactionalMessagesSheetProps> = (props) => (
//   <PaperProvider>
//     <TransactionalMessagesSheet {...props} />
//   </PaperProvider>
// );
// export default ProvidedTransactionalMessagesSheet;

export default TransactionalMessagesSheet; // Use this if PaperProvider is already at root
