import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsContextType {
  autoFillTransactionEnabled: boolean;
  toggleAutoFillTransaction: () => Promise<void>;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType>({
  autoFillTransactionEnabled: true,
  toggleAutoFillTransaction: async () => {},
  isLoading: true,
});

const SETTINGS_KEYS = {
  AUTO_FILL_TRANSACTION: 'autoFillTransactionEnabled',
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [autoFillTransactionEnabled, setAutoFillTransactionEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from AsyncStorage on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const autoFillSetting = await AsyncStorage.getItem(SETTINGS_KEYS.AUTO_FILL_TRANSACTION);
      if (autoFillSetting !== null) {
        setAutoFillTransactionEnabled(JSON.parse(autoFillSetting));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAutoFillTransaction = async () => {
    try {
      const newValue = !autoFillTransactionEnabled;
      setAutoFillTransactionEnabled(newValue);
      await AsyncStorage.setItem(SETTINGS_KEYS.AUTO_FILL_TRANSACTION, JSON.stringify(newValue));
    } catch (error) {
      console.error('Error saving auto-fill transaction setting:', error);
      // Revert the state if saving failed
      setAutoFillTransactionEnabled(autoFillTransactionEnabled);
    }
  };

  return (
    <SettingsContext.Provider 
      value={{
        autoFillTransactionEnabled,
        toggleAutoFillTransaction,
        isLoading,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
