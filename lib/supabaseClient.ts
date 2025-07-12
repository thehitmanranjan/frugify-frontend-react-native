import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

// Supabase configuration
const supabaseUrl = 'https://uvnkpcdjtrvlemvyslqg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bmtwY2RqdHJ2bGVtdnlzbHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3OTAxODUsImV4cCI6MjA2MjM2NjE4NX0.WZ0bojABrNI-WDdKlfbQ9KqHlJEj53WSpVbuNCCbhd4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Handle app state changes for token refresh
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
