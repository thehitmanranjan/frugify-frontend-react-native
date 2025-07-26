import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface PermissionModalProps {
  visible: boolean;
  title: string;
  message: string;
  onAllow: () => void;
  onCancel: () => void;
  onDontAskAgain: () => void;
}

const { width } = Dimensions.get('window');

export default function PermissionModal({
  visible,
  title,
  message,
  onAllow,
  onCancel,
  onDontAskAgain,
}: PermissionModalProps) {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[
          styles.container,
          {
            backgroundColor: theme.colors.surface,
            shadowColor: theme.colors.text,
          }
        ]}>
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
              <MaterialCommunityIcons
                name="bell-ring"
                size={32}
                color={theme.colors.primary}
              />
            </View>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {title}
            </Text>
          </View>

          <Text style={[styles.message, { color: theme.colors.text }]}>
            {message}
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, { borderColor: theme.colors.primary + '40' }]}
              onPress={onDontAskAgain}
            >
              <Text style={[styles.buttonText, { color: theme.colors.text }]}>
                Don't Ask Again
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, { borderColor: theme.colors.primary + '40' }]}
              onPress={onCancel}
            >
              <Text style={[styles.buttonText, { color: theme.colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton, { backgroundColor: theme.colors.primary }]}
              onPress={onAllow}
            >
              <Text style={[styles.buttonText, styles.primaryButtonText]}>
                Allow
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    width: width - 40,
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    elevation: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.8,
  },
  buttonContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  button: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButton: {
    borderWidth: 1,
  },
  primaryButton: {
    // backgroundColor will be set dynamically
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  primaryButtonText: {
    color: '#ffffff',
  },
});
