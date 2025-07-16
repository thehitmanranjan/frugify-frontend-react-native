import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Touchable, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Dialog, Portal, TextInput as PaperTextInput, Button } from 'react-native-paper';

// Screens
import HomeScreen from './screens/HomeScreen';
import BudgetScreen from './screens/BudgetScreen';
import SettingsScreen from './screens/SettingsScreen';
import CategoriesScreen from './screens/CategoriesScreen';
import SignupScreen from './screens/SignupScreen';
import EmailOtpScreen from './screens/EmailOtpScreen';

// Context
import { DateProvider } from './contexts/DateContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext'; // Import ThemeProvider and useTheme
import { PaperProvider } from 'react-native-paper'; // Import PaperProvider
import { SyncProvider } from './contexts/SyncContext';
import { SearchProvider } from './contexts/SearchContext';
import { SyncManager } from './contexts/SyncManager';
import { GoogleOAuthModal } from './components/GoogleOAuthModal';

// API Client
import { queryClient } from './lib/apiClient';
import { navigationRef } from './lib/RootNavigation';
import { linking } from './lib/linking';
import NotificationModule from './lib/NativeNotificationListener';
import { ensureNotificationListenerPermission } from './lib/NativeNotificationListener';

// Types
export type RootStackParamList = {
  Home: undefined;
  Budget: undefined;
  Settings: undefined;
  Categories: undefined;
};

// Create the stack navigator
const Stack = createStackNavigator<RootStackParamList>();

// Main App Navigator (for authenticated users)
const AppNavigator = () => (
  <Stack.Navigator
    initialRouteName="Home"
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="Budget" component={BudgetScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="Categories" component={CategoriesScreen} />
  </Stack.Navigator>
);

// Component to handle conditional rendering based on auth state
const MainScreen = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme(); // Use theme from context
  const [showSignup, setShowSignup] = React.useState(false);
  const [showEmailOtp, setShowEmailOtp] = React.useState(false);
  const [verifiedEmail, setVerifiedEmail] = React.useState('');
  const [emailToken, setEmailToken] = React.useState('');
  const [signupPrompt, setSignupPrompt] = React.useState(false);

  // Custom login handler to show signup prompt if user not found
  const LoginWithSignupPrompt = () => {
    const { login, sendOtp, verifyOtp, forgotPassword } = useAuth();
    const { theme } = useTheme(); // Use theme from context
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);
    const [showGoogleModal, setShowGoogleModal] = React.useState(false);
    
    // Forgot password state
    const [forgotPasswordVisible, setForgotPasswordVisible] = React.useState(false);
    const [currentStep, setCurrentStep] = React.useState<'email' | 'otp' | 'password'>('email');
    const [email, setEmail] = React.useState('');
    const [otp, setOtp] = React.useState('');
    const [newPassword, setNewPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [emailToken, setEmailToken] = React.useState('');
    const [forgotPasswordLoading, setForgotPasswordLoading] = React.useState(false);

    const handleLogin = async () => {
      if (!username.trim() || !password.trim()) {
        Alert.alert('Validation Error', 'Username/Email and password cannot be empty.');
        return;
      }
      setLoading(true);
      try {
        await login(username, password);
      } catch (error: any) {
        if (error?.message?.includes('User not found') || error?.message?.includes('404')) {
          setSignupPrompt(true);
        } else {
          Alert.alert('Login Failed in App.tsx', error?.message || 'An error occurred during login.');
        }
      } finally {
        setLoading(false);
      }
    };

    const handleGoogleLogin = async () => {
      setShowGoogleModal(true);
    };

    const handleForgotPassword = () => {
      setCurrentStep('email');
      setForgotPasswordVisible(true);
    };

    const handleSendOtp = async () => {
      if (!email.trim()) {
        Alert.alert('Error', 'Please enter your username or email');
        return;
      }

      setForgotPasswordLoading(true);
      try {
        await sendOtp(email, 'reset_password');
        setCurrentStep('otp');
        Alert.alert('Success', 'OTP sent to your registered email');
      } catch (error) {
        Alert.alert('Error', 'Failed to send OTP. Please try again.');
      } finally {
        setForgotPasswordLoading(false);
      }
    };

    const handleVerifyOtp = async () => {
      if (!otp.trim()) {
        Alert.alert('Error', 'Please enter the OTP');
        return;
      }

      setForgotPasswordLoading(true);
      try {
        const token = await verifyOtp(email, otp);
        setEmailToken(token);
        setCurrentStep('password');
        Alert.alert('Success', 'OTP verified successfully');
      } catch (error) {
        Alert.alert('Error', 'Invalid OTP. Please try again.');
      } finally {
        setForgotPasswordLoading(false);
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

      setForgotPasswordLoading(true);
      try {
        await forgotPassword(email, newPassword, emailToken);
        setForgotPasswordVisible(false);
        resetForgotPasswordForm();
        Alert.alert('Success', 'Password reset successfully! You can now login with your new password.');
      } catch (error) {
        Alert.alert('Error', 'Failed to reset password. Please try again.');
      } finally {
        setForgotPasswordLoading(false);
      }
    };

    const resetForgotPasswordForm = () => {
      setCurrentStep('email');
      setEmail('');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setEmailToken('');
    };

    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} // Adjust for iOS keyboard handling
      >
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Login</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.placeholder }]}
              placeholder="Username or Email"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.placeholder }]}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                style={{ position: 'absolute', right: 20, padding: 8 }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={24}
                  color={theme.colors.placeholder}
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.button, { backgroundColor: theme.colors.primary }]} onPress={handleLogin} disabled={loading}>
              <Text style={[styles.buttonText, { color: theme.colors.surface }]}>{loading ? 'Logging in...' : 'Submit'}</Text>
            </TouchableOpacity>
            
            {/* Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 20, width: '100%' }}>
              <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.placeholder }} />
              <Text style={{ marginHorizontal: 10, color: theme.colors.placeholder }}>OR</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.placeholder }} />
            </View>
            
            {/* Google Login Button */}
            <TouchableOpacity 
              style={[styles.googleButton, { borderColor: theme.colors.placeholder }]} 
              onPress={handleGoogleLogin} 
              disabled={loading}
            >
              <MaterialCommunityIcons name="google" size={24} color="#4285F4" style={{ marginRight: 10 }} />
              <Text style={[styles.googleButtonText, { color: theme.colors.text }]}>
                {loading ? 'Signing in...' : 'Continue with Google'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleForgotPassword} style={{ marginTop: 16 }}>
              <Text style={{ color: theme.colors.primary }}>Forgot Password?</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setShowEmailOtp(true)} style={{ marginTop: 8 }}>
              <Text style={{ color: theme.colors.primary }}>Don't have an account? Sign up</Text>
            </TouchableOpacity>
            {signupPrompt && (
              <View style={{ marginTop: 20 }}>
                <Text style={{ color: 'red', marginBottom: 8 }}>User does not exist. Would you like to sign up?</Text>
                <TouchableOpacity style={[styles.button, { backgroundColor: theme.colors.primary }]} onPress={() => { setShowEmailOtp(true); setSignupPrompt(false); }}>
                  <Text style={[styles.buttonText, { color: theme.colors.surface }]}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Forgot Password Dialog */}
            <Portal>
              <Dialog
                visible={forgotPasswordVisible}
                onDismiss={() => {
                  setForgotPasswordVisible(false);
                  resetForgotPasswordForm();
                }}
                style={{ backgroundColor: theme.colors.surface }}
              >
                <Dialog.Title style={{ color: theme.colors.text }}>
                  Reset Password
                </Dialog.Title>
                <Dialog.Content>
                  {currentStep === 'email' && (
                    <View>
                      <Text style={{ color: theme.colors.text, marginBottom: 16, lineHeight: 20 }}>
                        Enter your username or email address to receive a password reset OTP
                      </Text>
                      <PaperTextInput
                        label="Email/Username"
                        value={email}
                        onChangeText={setEmail}
                        style={{ marginBottom: 16 }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        theme={{ colors: { primary: theme.colors.primary } }}
                      />
                    </View>
                  )}

                  {currentStep === 'otp' && (
                    <View>
                      <Text style={{ color: theme.colors.text, marginBottom: 16, lineHeight: 20 }}>
                        Enter the OTP sent to your email or associated with your username: {email}
                      </Text>
                      <PaperTextInput
                        label="OTP"
                        value={otp}
                        onChangeText={setOtp}
                        style={{ marginBottom: 16 }}
                        keyboardType="numeric"
                        maxLength={6}
                        theme={{ colors: { primary: theme.colors.primary } }}
                      />
                    </View>
                  )}

                  {currentStep === 'password' && (
                    <View>
                      <Text style={{ color: theme.colors.text, marginBottom: 16, lineHeight: 20 }}>
                        Enter your new password
                      </Text>
                      <PaperTextInput
                        label="New Password"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        style={{ marginBottom: 16 }}
                        secureTextEntry
                        theme={{ colors: { primary: theme.colors.primary } }}
                      />
                      <PaperTextInput
                        label="Confirm Password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        style={{ marginBottom: 16 }}
                        secureTextEntry
                        theme={{ colors: { primary: theme.colors.primary } }}
                      />
                    </View>
                  )}
                </Dialog.Content>
                <Dialog.Actions>
                  <Button 
                    onPress={() => {
                      setForgotPasswordVisible(false);
                      resetForgotPasswordForm();
                    }} 
                    textColor={theme.colors.primary}
                  >
                    Cancel
                  </Button>
                  <Button
                    onPress={
                      currentStep === 'email' ? handleSendOtp :
                      currentStep === 'otp' ? handleVerifyOtp :
                      handleResetPassword
                    }
                    loading={forgotPasswordLoading}
                    disabled={forgotPasswordLoading}
                    textColor={theme.colors.primary}
                  >
                    {currentStep === 'email' ? 'Send OTP' :
                     currentStep === 'otp' ? 'Verify OTP' :
                     'Reset Password'}
                  </Button>
                </Dialog.Actions>
              </Dialog>
            </Portal>
            
            <GoogleOAuthModal
              visible={showGoogleModal}
              onClose={() => setShowGoogleModal(false)}
              onSuccess={() => {
                setShowGoogleModal(false);
                // Auth state will be handled by AuthContext
              }}
              theme={theme}
            />
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer 
      ref={navigationRef} 
      linking={linking}
      theme={{
        dark: theme.dark,
        colors: {
          background: theme.colors.background,
          primary: '',
          card: '',
          text: '',
          border: '',
          notification: ''
        }
      }}
    >
      {isAuthenticated ? (
        <AppNavigator />
      ) : showSignup ? (
        <SignupScreen 
          onSignupSuccess={() => {
            setShowSignup(false);
            setVerifiedEmail('');
            setEmailToken('');
          }}
          onBackToLogin={() => setShowSignup(false)}
          verifiedEmail={verifiedEmail}
          emailToken={emailToken}
        />
      ) : showEmailOtp ? (
        <EmailOtpScreen 
          onOtpVerified={(email, token) => {
            setVerifiedEmail(email);
            setEmailToken(token);
            setShowEmailOtp(false);
            setShowSignup(true);
          }}
          onBackToLogin={() => setShowEmailOtp(false)}
        />
      ) : (
        <LoginWithSignupPrompt />
      )}
      <StatusBar style={theme.dark ? "light" : "dark"} />
    </NavigationContainer>
  );
}

export default function App() {
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        await ensureNotificationListenerPermission();
      }
      appState.current = nextAppState;
    };

    // Initial call on mount
    (async () => {
      await ensureNotificationListenerPermission();
    })();

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <PaperProvider>
            <DateProvider>
              <SearchProvider>
                <SyncProvider>
                  <SyncManager />
                  <MainScreen />
                </SyncProvider>
              </SearchProvider>
            </DateProvider>
          </PaperProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  // container style is not strictly necessary here as App component just returns providers
  // but keeping it doesn't harm.
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5', // Optional: a background for loading screen
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  googleButton: {
    width: '100%',
    height: 50,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});