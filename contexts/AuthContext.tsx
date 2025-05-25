import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../lib/apiClient';
import { jwtDecode } from 'jwt-decode';
interface AuthContextData {
  isAuthenticated: boolean;
  userToken: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const tokenDataString = await AsyncStorage.getItem('userToken');
        if (tokenDataString) {
          const tokenData = JSON.parse(tokenDataString);
          if (tokenData.token && tokenData.expiry && new Date().getTime() < tokenData.expiry) {
            setUserToken(tokenData.token);
            setIsAuthenticated(true);
          } else {
            // Token expired or invalid
            await AsyncStorage.removeItem('userToken');
          }
        }
      } catch (e) {
        console.error("Failed to load token from storage", e);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      // Call backend API for authentication
      const response = await apiRequest<{ token: string; expiry?: number }>(
        'POST',
        '/api/user/login',
        { username, password }
      );

      const token = response.token;
      const decoded = jwtDecode(token);
      // const expiry = decoded?.exp || new Date().getTime() + 30 * 24 * 60 * 60 * 1000; // fallback: 30 days
      await AsyncStorage.setItem('userToken', JSON.stringify(token));
      setUserToken(token);
      setIsAuthenticated(true);
    } catch (e) {
      console.error('Login failed:', e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      setUserToken(null);
      setIsAuthenticated(false);
    } catch (e) {
      console.error("Failed to remove token from storage", e);
      // Handle error
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userToken, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
