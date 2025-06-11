import React from 'react';
import { Modal, View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SmsMessage } from '../hooks/useUnreadSms';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface SmsModalProps {
  visible: boolean;
  onClose: () => void;
  messages: SmsMessage[];
  loading: boolean;
  error: string | null;
}

export default function SmsModal({ visible, onClose, messages, loading, error }: SmsModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <View style={styles.header}>
            <Text style={styles.title}>Unread SMS</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          {loading ? (
            <Text style={styles.info}>Loading...</Text>
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : messages.length === 0 ? (
            <Text style={styles.info}>No unread messages found.</Text>
          ) : (
            <FlatList
              data={messages}
              keyExtractor={item => item._id}
              renderItem={({ item }) => (
                <View style={styles.smsItem}>
                  <Text style={styles.smsAddress}>{item.address}</Text>
                  <Text style={styles.smsBody}>{item.body}</Text>
                  <Text style={styles.smsDate}>{new Date(item.date).toLocaleString()}</Text>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  info: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
  },
  error: {
    color: '#F44336',
    textAlign: 'center',
    marginVertical: 20,
  },
  smsItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 8,
  },
  smsAddress: {
    fontWeight: 'bold',
    color: '#333',
  },
  smsBody: {
    color: '#444',
    marginVertical: 2,
  },
  smsDate: {
    color: '#888',
    fontSize: 12,
  },
});
