import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSync } from '../contexts/SyncContext';
import { debugCheckStoredMessages } from '../lib/NativeNotificationListener';

export const DebugSync: React.FC = () => {
  const { syncing, triggerSync } = useSync();

  const handleCheckMessages = async () => {
    try {
      console.log('🔍 Debug: Checking stored messages...');
      const messages = await debugCheckStoredMessages();
      
      if (messages.length === 0) {
        Alert.alert('Debug Info', 'No messages currently stored');
      } else {
        const messageInfo = messages.map((msg, index) => 
          `Message ${index + 1}:\nSender: ${msg.sender}\nText: ${msg.message}\nTime: ${new Date(msg.timestamp).toLocaleString()}`
        ).join('\n\n');
        
        Alert.alert(
          `Found ${messages.length} message(s)`,
          messageInfo,
          [{ text: 'OK' }],
          { cancelable: true }
        );
      }
    } catch (error) {
      console.error('Error checking messages:', error);
      Alert.alert('Error', 'Failed to check messages. See console for details.');
    }
  };

  const handleTriggerSync = () => {
    console.log('🚀 Debug: Manually triggering sync...');
    triggerSync();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Debug Sync Controls</Text>
      
      <TouchableOpacity 
        style={[styles.button, styles.checkButton]} 
        onPress={handleCheckMessages}
      >
        <Text style={styles.buttonText}>📋 Check Stored Messages</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, styles.syncButton, syncing && styles.syncingButton]} 
        onPress={handleTriggerSync}
        disabled={syncing}
      >
        <Text style={styles.buttonText}>
          {syncing ? '⏳ Syncing...' : '🔄 Trigger Sync'}
        </Text>
      </TouchableOpacity>
      
      <Text style={styles.status}>
        Status: {syncing ? 'Syncing in progress...' : 'Ready'}
      </Text>
      
      <Text style={styles.instructions}>
        💡 Check the console/logs to see detailed sync information
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  button: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 5,
    alignItems: 'center',
  },
  checkButton: {
    backgroundColor: '#007AFF',
  },
  syncButton: {
    backgroundColor: '#34C759',
  },
  syncingButton: {
    backgroundColor: '#FF9500',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  status: {
    marginTop: 15,
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
  },
  instructions: {
    marginTop: 10,
    fontSize: 12,
    textAlign: 'center',
    color: '#888',
    fontStyle: 'italic',
  },
});
