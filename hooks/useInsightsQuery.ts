import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiClient';

export function useInsightsQuery() {
  return useMutation({
    mutationFn: async (query: string) => {
      // Call the AI insights API with the query
      return await apiRequest<any>('POST', '/ai/ask', { query }, undefined, true);
    },
    onError: (error: Error) => {
      console.error('Error fetching insights:', error.message);
    },
  });
}
