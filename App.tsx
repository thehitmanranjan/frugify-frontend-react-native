import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

// Screens
import HomeScreen from './app/HomeScreen';
import BudgetScreen from './app/BudgetScreen';
import SettingsScreen from './app/SettingsScreen';

// Context
import { DateProvider } from './contexts/DateContext';

// API Client
import { queryClient } from './lib/apiClient';

// Types
export type RootStackParamList = {
  Home: undefined;
  Budget: undefined;
  Settings: undefined;
};

// Create the stack navigator
const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider>
        <DateProvider>
          <NavigationContainer>
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
            <StatusBar style="auto" />
          </NavigationContainer>
        </DateProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});