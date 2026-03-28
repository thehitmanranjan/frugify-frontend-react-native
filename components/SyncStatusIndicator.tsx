import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSyncStatus } from '../hooks/useLocalTransactions';
import { useTheme } from '../contexts/ThemeContext';

interface SyncStatusIndicatorProps {
  onPress?: () => void;
}

export default function SyncStatusIndicator({ onPress }: SyncStatusIndicatorProps) {
  const { theme } = useTheme();
  const syncStatus = useSyncStatus();

  const getStatusIcon = () => {
    if (syncStatus.pending > 0) {
      return (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      );
    }
    if (syncStatus.errors > 0) {
      return (
        <MaterialCommunityIcons name="alert-circle" size={20} color="#F44336" />
      );
    }
    return (
      <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
    );
  };

  const getStatusText = () => {
    if (syncStatus.pending > 0) {
      return `Syncing ${syncStatus.pending}...`;
    }
    if (syncStatus.errors > 0) {
      return `${syncStatus.errors} failed`;
    }
    return 'All synced';
  };

  const getStatusColor = () => {
    if (syncStatus.pending > 0) return theme.colors.primary;
    if (syncStatus.errors > 0) return '#F44336';
    return '#4CAF50';
  };

  if (syncStatus.pending === 0 && syncStatus.errors === 0) {
    return null; // Don't show when everything is synced
  }

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.colors.surface }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        {getStatusIcon()}
      </View>
      <Text style={[styles.text, { color: getStatusColor() }]}>
        {getStatusText()}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  iconContainer: {
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
