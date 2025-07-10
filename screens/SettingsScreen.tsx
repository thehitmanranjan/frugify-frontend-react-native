import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Divider, Switch, Dialog, Portal, TextInput as PaperTextInput, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

import Header from '../components/Header';
import { RootStackParamList } from '../App';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { isDarkMode, toggleTheme, theme } = useTheme();
  const { user, logout, sendOtp, verifyOtp, resetPassword } = useAuth();

  // Debug log to see what user data we have
  React.useEffect(() => {
    console.log('SettingsScreen - Current user data:', user);
    console.log('SettingsScreen - User name:', user?.name);
    console.log('SettingsScreen - User email:', user?.email);
    console.log('SettingsScreen - User username:', user?.username);
  }, [user]);

  // Change password state
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState<'otp' | 'password'>('otp');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailToken, setEmailToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleNavigateToCategories = () => {
    navigation.navigate('Categories');
  };

  const handleChangePassword = async () => {
    if (!user?.email) {
      Alert.alert('Error', 'User email not found');
      return;
    }

    setCurrentStep('otp');
    setChangePasswordVisible(true);
    
    // Automatically send OTP to user's registered email
    setIsLoading(true);
    try {
      await sendOtp(user.email, 'reset_password');
      Alert.alert('Success', `OTP sent to ${user.email}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
      setChangePasswordVisible(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      Alert.alert('Error', 'Please enter the OTP');
      return;
    }

    if (!user?.email) {
      Alert.alert('Error', 'User email not found');
      return;
    }

    setIsLoading(true);
    try {
      const token = await verifyOtp(user.email, otp);
      setEmailToken(token); // Store the actual email_token returned by the API
      setCurrentStep('password');
      Alert.alert('Success', 'OTP verified successfully');
    } catch (error) {
      Alert.alert('Error', 'Invalid OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (!user?.email) {
      Alert.alert('Error', 'User email not found');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(user.email, newPassword, emailToken);
      // Close dialog and reset form on success
      setChangePasswordVisible(false);
      resetChangePasswordForm();
      Alert.alert('Success', 'Password changed successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to change password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetChangePasswordForm = () => {
    setCurrentStep('otp');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setEmailToken('');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header />
      
      <View style={styles.content}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Profile</Text>
          
          <View style={styles.profileItem}>
            <MaterialCommunityIcons 
              name="account" 
              size={24} 
              color={theme.colors.text} 
              style={styles.profileIcon}
            />
            <View style={styles.profileInfo}>
              <Text style={[styles.profileLabel, { color: theme.colors.placeholder }]}>Name</Text>
              <Text style={[styles.profileValue, { color: theme.colors.text }]}>{user?.name || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.profileItem}>
            <MaterialCommunityIcons 
              name="email" 
              size={24} 
              color={theme.colors.text} 
              style={styles.profileIcon}
            />
            <View style={styles.profileInfo}>
              <Text style={[styles.profileLabel, { color: theme.colors.placeholder }]}>Email</Text>
              <Text style={[styles.profileValue, { color: theme.colors.text }]}>{user?.email || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.profileItem}>
            <MaterialCommunityIcons 
              name="account-circle" 
              size={24} 
              color={theme.colors.text} 
              style={styles.profileIcon}
            />
            <View style={styles.profileInfo}>
              <Text style={[styles.profileLabel, { color: theme.colors.placeholder }]}>Username</Text>
              <Text style={[styles.profileValue, { color: theme.colors.text }]}>{user?.username || 'N/A'}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.changePasswordButton} onPress={handleChangePassword}>
            <MaterialCommunityIcons 
              name="lock-reset" 
              size={24} 
              color={theme.colors.primary} 
              style={styles.settingIcon}
            />
            <Text style={[styles.changePasswordText, { color: theme.colors.primary }]}>Change Password</Text>
            <MaterialCommunityIcons 
              name="chevron-right" 
              size={24} 
              color={theme.colors.placeholder} 
            />
          </TouchableOpacity>
        </View>

        <Divider style={{ backgroundColor: theme.colors.placeholder, marginVertical: 16 }} />

        {/* Dark Mode Toggle */}
        <View style={styles.settingItem}>
          <Text style={[styles.settingText, { color: theme.colors.text }]}>Dark Mode</Text>
          <Switch value={isDarkMode} onValueChange={toggleTheme} color={theme.colors.primary} />
        </View>
        
        <Divider style={{ backgroundColor: theme.colors.placeholder, marginVertical: 16 }} />

        {/* Categories Navigation */}
        <TouchableOpacity style={styles.settingItem} onPress={handleNavigateToCategories}>
          <View style={styles.settingItemContent}>
            <MaterialCommunityIcons 
              name="shape" 
              size={24} 
              color={theme.colors.text} 
              style={styles.settingIcon}
            />
            <Text style={[styles.settingText, { color: theme.colors.text }]}>Categories</Text>
          </View>
          <MaterialCommunityIcons 
            name="chevron-right" 
            size={24} 
            color={theme.colors.placeholder} 
          />
        </TouchableOpacity>
      </View>

      {/* Change Password Dialog */}
      <Portal>
        <Dialog
          visible={changePasswordVisible}
          onDismiss={() => {
            setChangePasswordVisible(false);
            resetChangePasswordForm();
          }}
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title style={{ color: theme.colors.text }}>
            Change Password
          </Dialog.Title>
          <Dialog.Content>
            {currentStep === 'otp' && (
              <View>
                <Text style={[styles.dialogText, { color: theme.colors.text }]}>
                  Enter the OTP sent to your registered email: {user?.email}
                </Text>
                <PaperTextInput
                  label="OTP"
                  value={otp}
                  onChangeText={setOtp}
                  style={styles.input}
                  keyboardType="numeric"
                  maxLength={6}
                  theme={{ colors: { primary: theme.colors.primary } }}
                />
              </View>
            )}

            {currentStep === 'password' && (
              <View>
                <Text style={[styles.dialogText, { color: theme.colors.text }]}>
                  Enter your new password
                </Text>
                <PaperTextInput
                  label="New Password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  style={styles.input}
                  secureTextEntry
                  theme={{ colors: { primary: theme.colors.primary } }}
                />
                <PaperTextInput
                  label="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  style={styles.input}
                  secureTextEntry
                  theme={{ colors: { primary: theme.colors.primary } }}
                />
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button 
              onPress={() => {
                setChangePasswordVisible(false);
                resetChangePasswordForm();
              }} 
              textColor={theme.colors.primary}
            >
              Cancel
            </Button>
            <Button
              onPress={currentStep === 'otp' ? handleVerifyOtp : handleResetPassword}
              loading={isLoading}
              disabled={isLoading}
              textColor={theme.colors.primary}
            >
              {currentStep === 'otp' ? 'Verify OTP' : 'Change Password'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  profileSection: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  profileIcon: {
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  profileValue: {
    fontSize: 16,
    fontWeight: '400',
  },
  changePasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  changePasswordText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginLeft: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  settingItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 12,
  },
  settingText: {
    fontSize: 16,
  },
  input: {
    marginBottom: 16,
  },
  dialogText: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
});
