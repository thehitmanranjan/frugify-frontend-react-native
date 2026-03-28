import { useEffect } from 'react';
import { useCategories } from './useCategories';
import { database } from '../lib/database';

// Hook to sync categories from server to local database
export function useCategoriesSync() {
  const { data: categories } = useCategories();

  useEffect(() => {
    if (categories && categories.length > 0) {
      // Sync categories to local database
      database.upsertCategories(
        categories.map(cat => ({
          ...cat,
          syncStatus: 'synced' as const,
        }))
      ).catch(error => {
        console.error('Failed to sync categories to local DB:', error);
      });
    }
  }, [categories]);

  return categories;
}
