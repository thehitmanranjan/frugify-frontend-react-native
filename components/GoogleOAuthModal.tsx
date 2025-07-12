import React, { useState } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Text, Alert, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabaseClient';

interface GoogleOAuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  theme: any;
}

export const GoogleOAuthModal: React.FC<GoogleOAuthModalProps> = ({
  visible,
  onClose,
  onSuccess,
  theme,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleOAuthFlow = async () => {
    try {
      setIsLoading(true);
      
      // Get the OAuth URL from Supabase
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'com.thehitmanranjan.frugify://auth/callback',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.url) {
        console.log('Opening OAuth URL:', data.url);
        
        // Open the OAuth URL in the system browser
        const supported = await Linking.canOpenURL(data.url);
        if (supported) {
          await Linking.openURL(data.url);
          onClose(); // Close the modal as user will be redirected to browser
        } else {
          throw new Error('Cannot open authentication URL');
        }
      } else {
        throw new Error('No authentication URL received');
      }
    } catch (error: any) {
      console.error('OAuth error:', error);
      Alert.alert('Authentication Error', error.message || 'Failed to initiate Google authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Sign in with Google
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={theme.colors.text}
              />
            </TouchableOpacity>
          </View>
          
          <View style={styles.content}>
            <Text style={[styles.description, { color: theme.colors.text }]}>
              You'll be redirected to Google's secure authentication page. After signing in with your Google account, you'll be automatically redirected back to Frugify.
            </Text>
            
            <Text style={[styles.brandNote, { color: theme.colors.placeholder }]}>
              Note: The authentication page will show "uvnkpcdjtrvlemvyslqg.supabase.co" - this is Frugify's secure authentication service.
            </Text>
            
            <TouchableOpacity
              style={[styles.authButton, { borderColor: theme.colors.placeholder }]}
              onPress={handleOAuthFlow}
              disabled={isLoading}
            >
              <MaterialCommunityIcons name="google" size={24} color="#4285F4" />
              <Text style={[styles.authButtonText, { color: theme.colors.text }]}>
                {isLoading ? 'Opening browser...' : 'Continue with Google'}
              </Text>
            </TouchableOpacity>
            
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 10,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  content: {
    alignItems: 'center',
  },
  description: {
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: '100%',
    marginBottom: 15,
  },
  authButtonText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '500',
  },
  note: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
  },
  brandNote: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 14,
    marginBottom: 20,
    fontStyle: 'italic',
  },
});
