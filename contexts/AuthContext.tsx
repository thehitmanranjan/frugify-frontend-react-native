import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../lib/apiClient';
import { decode as base64Decode } from 'base-64';
import { supabase } from '../lib/supabaseClient';
import * as Linking from 'expo-linking';

interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  provider?: 'email' | 'google'; // Add provider field
}

interface AuthContextData {
  isAuthenticated: boolean;
  userToken: string | null;
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>; // Add Google login method
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
        // First check for existing token-based auth (your original system)
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
              name: payload.name,
              provider: payload.provider || 'email'
            });
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
          } else {
            // Token expired or invalid
            console.log('Token expired or invalid, removing from storage'); // Debug log
            await AsyncStorage.removeItem('userToken');
          }
        }

        // Check for Supabase Google OAuth session only if no valid token found
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Supabase session check:', { session, error });
        
        if (session?.user && !error) {
          console.log('Found active Supabase session, will authenticate with backend');
          // Don't set user state here - let the auth state listener handle backend authentication
        } else {
          console.log('No active Supabase session found');
        }
      } catch (e) {
        console.error("Failed to load auth status", e);
      } finally {
        setIsLoading(false);
      }
    };

    // Set up Supabase auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Supabase auth state changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('User signed in via Google OAuth:', session.user);
          
          try {
            // After successful Google OAuth, authenticate with your backend
            const googleUser = session.user;
            const email = googleUser.email;
            const name = googleUser.user_metadata?.name || googleUser.email || '';
            
            console.log('Authenticating Google user with backend:', { email, name });
            
            // Call your backend to authenticate/register the Google user
            const response = await apiRequest<{ token: string; user: any }>('POST', '/api/user/google-auth', {
              email: email,
              name: name,
              google_id: googleUser.id,
              provider: 'google'
            });
            
            console.log('Backend Google auth response:', response);
            
            // Use the backend JWT token instead of Supabase token
            const token = response.token;
            const payload = parseJwt(token);
            const expiry = payload.exp ? payload.exp * 1000 : (new Date().getTime() + 7 * 24 * 60 * 60 * 1000);
            const tokenData = { token, expiry };
            
            await AsyncStorage.setItem('userToken', JSON.stringify(tokenData));
            
            // Set user data from backend response (this will have the correct username)
            setUser({
              id: response.user.id || payload.id,
              username: response.user.username || payload.username,
              email: response.user.email || payload.email,
              name: response.user.name || payload.name,
              provider: 'google'
            });
            setUserToken(token);
            setIsAuthenticated(true);
            setIsLoading(false);
            
          } catch (error) {
            console.error('Error authenticating with backend after Google OAuth:', error);
            
            // Check if it's a network error
            if (error instanceof Error && error.message.includes('Network request failed')) {
              console.error('Network error during Google authentication. Check API base URL configuration.');
              console.error('Current API base URL might be incorrect or unreachable.');
            }
            
            // If backend auth fails, sign out from Supabase and show error
            await supabase.auth.signOut();
            setUser(null);
            setUserToken(null);
            setIsAuthenticated(false);
            setIsLoading(false);
            
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setUser(null);
          setUserToken(null);
          setIsAuthenticated(false);
          setIsLoading(false);
        }
      }
    );

    // Handle OAuth callback URLs
    const handleUrl = async (url: string) => {
      console.log('Handling URL:', url);
      
      // Check if this is an OAuth callback
      if (url.includes('auth/callback')) {
        console.log('OAuth callback detected');
        try {
          // Parse the URL to extract tokens from the fragment
          const urlParts = url.split('#');
          if (urlParts.length > 1) {
            const fragment = urlParts[1];
            console.log('URL fragment:', fragment);
            
            // Parse tokens from fragment
            const params = new URLSearchParams(fragment);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            
            if (accessToken) {
              console.log('Found access token, setting Supabase session...');
              
              // Set the session in Supabase
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || '',
              });
              
              if (error) {
                console.error('Error setting Supabase session:', error);
              } else {
                console.log('Supabase session set successfully:', data);
                // The onAuthStateChange listener will automatically handle the rest
              }
            } else {
              console.log('No access token found in URL fragment');
            }
          } else {
            console.log('No fragment found in OAuth callback URL');
          }
        } catch (error) {
          console.error('Error handling OAuth URL:', error);
        }
      }
    };

    // Listen for URL changes (OAuth redirects)
    const urlSubscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });

    // Check if app was opened with a URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl(url);
      }
    });

    checkAuthStatus();

    // Cleanup subscriptions on unmount
    return () => {
      subscription.unsubscribe();
      urlSubscription?.remove();
    };
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
      // Handle Supabase Google OAuth logout
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase logout error:', error);
      }
      
      // Handle token-based auth logout (your original system)
      await AsyncStorage.removeItem('userToken');
      
      // Reset state
      setUserToken(null);
      setUser(null);
      setIsAuthenticated(false);
    } catch (e) {
      console.error("Failed to logout", e);
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

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      console.log('Initiating Google OAuth with Supabase...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://uvnkpcdjtrvlemvyslqg.supabase.co/auth/v1/callback',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Supabase Google OAuth error:', error);
        throw error;
      }

      console.log('Google OAuth initiated successfully:', data);
      
      // Note: The actual user session will be handled by the auth state listener
      // that we'll set up in useEffect. For now, we return successfully
      // and the user will be redirected to complete the OAuth flow.
      
    } catch (e) {
      console.error('Google login error:', e);
      throw e;
    } finally {
      setIsLoading(false);
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
      forgotPassword,
      loginWithGoogle // Provide Google login method
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
