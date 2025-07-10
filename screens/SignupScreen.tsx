import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { apiRequest } from '../lib/apiClient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const SignupScreen: React.FC<{ 
  onSignupSuccess: () => void; 
  onBackToLogin?: () => void;
  verifiedEmail?: string;
  emailToken?: string;
}> = ({ onSignupSuccess, onBackToLogin, verifiedEmail = '', emailToken = '' }) => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState(verifiedEmail);
  const [phone_number, setPhoneNumber] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !username.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('All required fields must be filled.');
      return;
    }
    // Basic email validation
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    // Basic phone validation (10-15 digits) - only if phone number is provided
    if (phone_number.trim() && !/^\d{10,15}$/.test(phone_number)) {
      setError('Please enter a valid phone number (10-15 digits).');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const signupData: any = { name, email, phone_number, username, password };
      if (emailToken) {
        signupData.email_token = emailToken;
      }
      await apiRequest('POST', '/api/user/signup', signupData);
      Alert.alert('Success', 'Signup successful! Please login.');
      onSignupSuccess();
    } catch (error: any) {
      setError(error?.message || 'An error occurred during signup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={{ position: 'absolute', top: 40, left: 20, zIndex: 10, padding: 8 }}
          onPress={() => {
            if (onBackToLogin) {
              onBackToLogin();
            } else {
              // If using setShowSignup in App.tsx, emit a custom event
              const event = new CustomEvent('frugify:backToLogin');
              window.dispatchEvent(event);
            }
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Sign Up</Text>
        {error ? (
          <View style={[styles.errorContainer, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.errorText, { color: '#F44336' }]}>{error}</Text>
          </View>
        ) : null}
      <View style={{ width: '100%' }}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Name <Text style={{ color: 'red' }}>*</Text></Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.placeholder }]}
          placeholder="Name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          placeholderTextColor={theme.colors.placeholder}
        />
        <Text style={[styles.label, { color: theme.colors.text }]}>Email <Text style={{ color: 'red' }}>*</Text> {verifiedEmail && <Text style={{ color: 'green' }}>✓ Verified</Text>}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.placeholder }]}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor={theme.colors.placeholder}
          editable={!verifiedEmail}
        />
        <Text style={[styles.label, { color: theme.colors.text }]}>Phone Number</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.placeholder }]}
          placeholder="Phone Number (For Indian Users)"
          value={phone_number}
          onChangeText={setPhoneNumber}
          autoCapitalize="none"
          keyboardType="phone-pad"
          placeholderTextColor={theme.colors.placeholder}
        />
        <Text style={[styles.label, { color: theme.colors.text }]}>Username <Text style={{ color: 'red' }}>*</Text></Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.placeholder }]}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          placeholderTextColor={theme.colors.placeholder}
        />
      </View>
      <View style={{ width: '100%', marginBottom: 15 }}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Password <Text style={{ color: 'red' }}>*</Text></Text>
        <View style={{ position: 'relative' }}>
          <TextInput
            style={[styles.input, { marginBottom: 0, backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.placeholder, paddingRight: 50 }]}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholderTextColor={theme.colors.placeholder}
          />
          <TouchableOpacity
            onPress={() => setShowPassword((prev) => !prev)}
            style={styles.eyeIcon}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons
              name={showPassword ? 'eye-off' : 'eye'}
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>
      <View style={{ width: '100%', marginBottom: 15 }}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Confirm Password <Text style={{ color: 'red' }}>*</Text></Text>
        <View style={{ position: 'relative' }}>
          <TextInput
            style={[styles.input, { marginBottom: 0, backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.placeholder, paddingRight: 50 }]}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            placeholderTextColor={theme.colors.placeholder}
          />
          <TouchableOpacity
            onPress={() => setShowConfirmPassword((prev) => !prev)}
            style={styles.eyeIcon}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons
              name={showConfirmPassword ? 'eye-off' : 'eye'}
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity style={[styles.button, { backgroundColor: theme.colors.primary }]} onPress={handleSignup} disabled={loading}>
        <Text style={[styles.buttonText, { color: theme.colors.surface }]}>{loading ? 'Signing Up...' : 'Sign Up'}</Text>
      </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
    marginLeft: 2,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 50,
  },
  button: {
    width: '100%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
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

export default SignupScreen;
