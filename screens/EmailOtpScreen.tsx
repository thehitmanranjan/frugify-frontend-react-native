import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { apiRequest } from '../lib/apiClient';
import { useTheme } from '../contexts/ThemeContext';

interface EmailOtpScreenProps {
  onOtpVerified: (email: string, emailToken: string) => void;
  onBackToLogin?: () => void;
}

const EmailOtpScreen: React.FC<EmailOtpScreenProps> = ({ onOtpVerified, onBackToLogin }) => {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async () => {
    if (!email.trim()) {
      setError('Please enter your username or email address.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await apiRequest('POST', '/api/user/send-otp', { email, type: "new_user" });
      Alert.alert('Success', 'OTP sent to your email address.');
      setStep('otp');
    } catch (error: any) {
      setError(error?.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setError('Please enter the OTP.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest<{ email_token: string }>('POST', '/api/user/verify-otp', { 
        email, 
        otp
      });
      Alert.alert('Success', 'Username/Email verified!');
      onOtpVerified(email, res.email_token);
    } catch (error: any) {
      setError(error?.message || 'Failed to verify OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      {onBackToLogin && (
        <TouchableOpacity
          style={{ position: 'absolute', top: 40, left: 20, zIndex: 10, padding: 8 }}
          onPress={onBackToLogin}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={28} color={theme.colors.text} />
        </TouchableOpacity>
      )}
      <Text style={[styles.title, { color: theme.colors.text }]}>Verify Account</Text>
      {error ? (
        <View style={[styles.errorContainer, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.errorText, { color: '#F44336' }]}>{error}</Text>
        </View>
      ) : null}
      {step === 'email' ? (
        <>
          <Text style={[styles.label, { color: theme.colors.text }]}>Username or Email</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.placeholder }]}
            placeholder="Enter your username or email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor={theme.colors.placeholder}
          />
          <TouchableOpacity style={[styles.button, { backgroundColor: theme.colors.primary }]} onPress={handleSendOtp} disabled={loading}>
            <Text style={[styles.buttonText, { color: theme.colors.surface }]}>{loading ? 'Sending...' : 'Send OTP'}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={[styles.label, { color: theme.colors.text }]}>Enter OTP sent to {email}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.placeholder }]}
            placeholder="Enter OTP"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            placeholderTextColor={theme.colors.placeholder}
            maxLength={6}
          />
          <TouchableOpacity style={[styles.button, { backgroundColor: theme.colors.primary }]} onPress={handleVerifyOtp} disabled={loading}>
            <Text style={[styles.buttonText, { color: theme.colors.surface }]}>{loading ? 'Verifying...' : 'Verify OTP'}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
    marginLeft: 2,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  button: {
    width: '100%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    marginTop: 10,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorContainer: {
    width: '100%',
    padding: 12,
    borderRadius: 5,
    marginBottom: 15,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default EmailOtpScreen;
