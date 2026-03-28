import { useEffect, useState } from 'react';
import { database } from '../lib/database';
import { syncManager } from '../lib/syncManager';
import { useAuth } from '../contexts/AuthContext';
import React from 'react';

export function DatabaseInitializer({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const initDatabase = async () => {
      try {
        await database.init();
        console.log('Database initialized successfully');
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
        setIsReady(true); // Continue anyway to avoid blocking the app
      }
    };

    initDatabase();
  }, []);

  useEffect(() => {
    if (isAuthenticated && isReady) {
      // Start background sync when user is authenticated
      syncManager.startBackgroundSync(30000); // Sync every 30 seconds

      return () => {
        syncManager.stopBackgroundSync();
      };
    }
  }, [isAuthenticated, isReady]);

  if (!isReady) {
    return null; // Or a loading spinner
  }

  return <>{children}</>;
}
