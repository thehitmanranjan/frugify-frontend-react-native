import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface TransactionSyncBadgeProps {
  syncStatus: 'pending' | 'synced' | 'error';
  size?: number;
}

export default function TransactionSyncBadge({ 
  syncStatus, 
  size = 16 
}: TransactionSyncBadgeProps) {
  if (syncStatus === 'synced') {
    return (
      <View style={styles.badge}>
        <MaterialCommunityIcons 
          name="check-circle" 
          size={size} 
          color="#4CAF50" 
        />
      </View>
    );
  }

  if (syncStatus === 'pending') {
    return (
      <View style={styles.badge}>
        <ActivityIndicator size="small" color="#2196F3" />
      </View>
    );
  }

  if (syncStatus === 'error') {
    return (
      <View style={styles.badge}>
        <MaterialCommunityIcons 
          name="alert-circle" 
          size={size} 
          color="#F44336" 
        />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  badge: {
    marginLeft: 8,
  },
});
