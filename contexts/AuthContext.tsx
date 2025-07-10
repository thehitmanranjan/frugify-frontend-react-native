import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../lib/apiClient';
import { decode as base64Decode } from 'base-64';
interface User {
  id: string;
  username: string;
  email: string;
  name: string;
}

interface AuthContextData {
  isAuthenticated: boolean;
  userToken: string | null;
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  sendOtp: (email: string, type?: 'new_user' | 'reset_password') => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<string>;
  resetPassword: (email: string, newPassword: string, emailToken: string) => Promise<void>;
  forgotPassword: (email: string, newPassword: string, emailToken: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// Helper function to parse JWT with React Native compatible base64 decoding
const parseJwt = (token: string) => {
  try {
    console.log('Parsing JWT token:', token.substring(0, 50) + '...'); // Log first 50 chars
    
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid JWT format - expected 3 parts, got:', parts.length);
      return {};
    }
    
    const base64Url = parts[1];
    console.log('Base64URL payload:', base64Url);
    
    // Convert base64url to base64
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }
    
    console.log('Base64 payload after padding:', base64);
    
    // Decode base64 using the base-64 library
    let jsonPayload;
    try {
      const decoded = base64Decode(base64);
      console.log('Decoded base64:', decoded);
      
      jsonPayload = decoded;
      console.log('JSON payload string:', jsonPayload);
    } catch (decodeError) {
      console.error('Error decoding base64:', decodeError);
      return {};
    }
    
    const parsed = JSON.parse(jsonPayload);
    console.log('Successfully parsed JWT payload:', parsed);
    return parsed;
  } catch (e) {
    console.error('Error parsing JWT:', e);
    console.error('Token that failed to parse:', token);
    return {};
  }
};

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const tokenDataString = await AsyncStorage.getItem('userToken');
        console.log('Retrieved token data string:', tokenDataString); // Debug log
        if (tokenDataString) {
          const tokenData = JSON.parse(tokenDataString);
          console.log('Parsed token data:', tokenData); // Debug log
          if (tokenData.token && tokenData.expiry && new Date().getTime() < tokenData.expiry) {
            const payload = parseJwt(tokenData.token);
            console.log('JWT payload:', payload); // Debug log
            console.log('Setting user data:', {
              id: payload.id,
              username: payload.username,
              email: payload.email,
              name: payload.name
            }); // Debug log
            setUserToken(tokenData.token);
            setUser({
              id: payload.id,
              username: payload.username,
              email: payload.email,
              name: payload.name
            });
            setIsAuthenticated(true);
          } else {
            // Token expired or invalid
            console.log('Token expired or invalid, removing from storage'); // Debug log
            await AsyncStorage.removeItem('userToken');
          }
        } else {
          console.log('No token found in storage'); // Debug log
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
      console.log('Login successful, received token:', token); // Debug log
      
      const payload = parseJwt(token);
      console.log('Login - parsed payload:', payload); // Debug log
      const expiry = payload.exp ? payload.exp * 1000 : (new Date().getTime() + 7 * 24 * 60 * 60 * 1000);
      const tokenData = { token, expiry };
      await AsyncStorage.setItem('userToken', JSON.stringify(tokenData));
      console.log('Token saved to storage:', JSON.stringify(tokenData)); // Debug log
      setUserToken(token);
      const userData = {
        id: payload.id,
        username: payload.username,
        email: payload.email,
        name: payload.name
      };
      console.log('Login - setting user data:', userData); // Debug log
      setUser(userData);
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
      setUser(null);
      setIsAuthenticated(false);
    } catch (e) {
      console.error("Failed to remove token from storage", e);
      // Handle error
    }
  };

  const sendOtp = async (email: string, type: 'new_user' | 'reset_password' = 'reset_password') => {
    try {
      await apiRequest('POST', '/api/user/send-otp', { email, type });
    } catch (e) {
      console.error('Send OTP failed:', e);
      throw e;
    }
  };

  const verifyOtp = async (email: string, otp: string) => {
    try {
      const response = await apiRequest<{ email_token: string }>('POST', '/api/user/verify-otp', { email, otp });
      return response.email_token;
    } catch (e) {
      console.error('Verify OTP failed:', e);
      throw e;
    }
  };

  const resetPassword = async (email: string, newPassword: string, emailToken: string) => {
    try {
      await apiRequest('POST', '/api/user/reset-password', {
        email,
        new_password: newPassword,
        email_token: emailToken
      });
    } catch (e) {
      console.error('Reset password failed:', e);
      throw e;
    }
  };

  const forgotPassword = async (email: string, newPassword: string, emailToken: string) => {
    try {
      await apiRequest('POST', '/api/user/reset-password', {
        email,
        new_password: newPassword,
        email_token: emailToken
      });
    } catch (e) {
      console.error('Forgot password failed:', e);
      throw e;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      userToken, 
      user, 
      isLoading, 
      login, 
      logout, 
      sendOtp, 
      verifyOtp, 
      resetPassword,
      forgotPassword
    }}>
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
