import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Touchable, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Screens
import HomeScreen from './screens/HomeScreen';
import BudgetScreen from './screens/BudgetScreen';
import SettingsScreen from './screens/SettingsScreen';
import SignupScreen from './screens/SignupScreen';

// Context
import { DateProvider } from './contexts/DateContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext'; // Import ThemeProvider and useTheme
import { PaperProvider } from 'react-native-paper'; // Import PaperProvider

// API Client
import { queryClient } from './lib/apiClient';
import { navigationRef } from './lib/RootNavigation';

// Types
export type RootStackParamList = {
  Home: undefined;
  Budget: undefined;
  Settings: undefined;
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
  </Stack.Navigator>
);

// Component to handle conditional rendering based on auth state
const MainScreen = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme(); // Use theme from context
  const [showSignup, setShowSignup] = React.useState(false);
  const [signupPrompt, setSignupPrompt] = React.useState(false);

  // Custom login handler to show signup prompt if user not found
  const LoginWithSignupPrompt = () => {
    const { login } = useAuth();
    const { theme } = useTheme(); // Use theme from context
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);

    const handleLogin = async () => {
      if (!username.trim() || !password.trim()) {
        Alert.alert('Validation Error', 'Username and password cannot be empty.');
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
              placeholder="Username"
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
            <TouchableOpacity onPress={() => setShowSignup(true)} style={{ marginTop: 16 }}>
              <Text style={{ color: theme.colors.primary }}>Don't have an account? Sign up</Text>
            </TouchableOpacity>
            {signupPrompt && (
              <View style={{ marginTop: 20 }}>
                <Text style={{ color: 'red', marginBottom: 8 }}>User does not exist. Would you like to sign up?</Text>
                <TouchableOpacity style={[styles.button, { backgroundColor: theme.colors.primary }]} onPress={() => { setShowSignup(true); setSignupPrompt(false); }}>
                  <Text style={[styles.buttonText, { color: theme.colors.surface }]}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            )}
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
    <NavigationContainer ref={navigationRef} theme={{
      dark: theme.dark,
      colors: {
        background: theme.colors.background,
        primary: '',
        card: '',
        text: '',
        border: '',
        notification: ''
      }
    }}>
      {isAuthenticated ? (
        <AppNavigator />
      ) : showSignup ? (
        <SignupScreen onSignupSuccess={() => setShowSignup(false)} />
      ) : (
        <LoginWithSignupPrompt />
      )}
      <StatusBar style={theme.dark ? "light" : "dark"} />
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <PaperProvider>
            <DateProvider>
              <MainScreen />
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
});