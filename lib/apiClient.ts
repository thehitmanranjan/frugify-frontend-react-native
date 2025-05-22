import { QueryClient } from '@tanstack/react-query';

const API_BASE_URL = 'https://mithilafoods1.com';
// const API_BASE_URL = 'https://frugify-backend.onrender.com';

// Log the selected API URL for debugging
console.log(`Using API base URL: ${API_BASE_URL || 'relative paths (same domain)'}`);

// Configure a proxy if needed (for local development)
const USE_PROXY = false; // Set to true if you're testing locally
const PROXY_URL = '/api'; // Local proxy path

/**
 * Helper to throw errors for non-2xx responses
 */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage;
    try {
      const data = await res.json();
      errorMessage = data.message || data.error || res.statusText;
    } catch (err) {
      errorMessage = res.statusText;
    }
    console.error(`API Error (${res.status}): ${errorMessage}`);
    throw new Error(errorMessage);
  }
}

/**
 * Generic API request function
 */
export async function apiRequest<T>(
  method: string,
  endpoint: string,
  data?: any,
  options?: RequestInit
): Promise<T> {
  // Determine API URL based on proxy setting
  const baseUrl = USE_PROXY ? PROXY_URL : API_BASE_URL;
  const url = `${baseUrl}${endpoint}`;
  
  console.log(`API Request: ${method} ${url}`);
  
  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    // In web browsers, 'include' can cause CORS issues, 'same-origin' is safer
    credentials: 'same-origin',
    // Don't set mode for default behavior
    ...options,
  };

  if (data) {
    config.body = JSON.stringify(data);
    console.log('Request data:', data);
  }

  try {
    const response = await fetch(url, config);
    
    // Log response status
    console.log(`API Response status: ${response.status} for ${method} ${endpoint}`);
    
    // Check for CORS or network issues (status will be 0)
    if (response.status === 0) {
      throw new Error('Network error - possible CORS issue');
    }
    
    await throwIfResNotOk(response);
    
    // For 204 No Content, return null
    if (response.status === 204) {
      return null as T;
    }

    try {
      const responseData = await response.json();
      console.log('Response data:', responseData);
      return responseData;
    } catch (jsonError: any) { // Using any for simplicity in error handling
      console.error('Error parsing JSON response:', jsonError);
      // If there's an error parsing JSON, throw a more descriptive error
      throw new Error(`Failed to parse API response from ${endpoint}: ${jsonError.message}`);
    }
  } catch (error: any) { // Using any for simplicity in error handling
    console.error(`Error in API request to ${endpoint}:`, error);
    
    // Add more context for different error types
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      console.error('Network error - check internet connection');
      throw new Error(`Network error connecting to ${url}. Please check your internet connection and try again.`);
    } else if (error.message.includes('CORS')) {
      console.error('CORS error - API server may not allow requests from this origin');
      throw new Error(`CORS policy error. The API server at ${API_BASE_URL} doesn't allow requests from this origin.`);
    }
    
    throw error;
  }
}

/**
 * Configure the QueryClient with default options
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        console.error('Mutation error:', error);
      }
    }
  },
});