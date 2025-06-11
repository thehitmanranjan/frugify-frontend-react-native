import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '../lib/apiClient';

export function useCreateTransactionFromSpeech() {
  return useMutation({
    mutationFn: async (text: string) => {
      // Call the AI transaction API with the transcript as 'text'
    return await apiRequest<any>('POST', '/ai/createTransaction', { text }, undefined, true);    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({
        queryKey: ['/api/transactions/summary'],
        exact: false
      });
    },
    onError: (error: Error) => {
      console.error('Error creating transaction from speech:', error.message);
    },
  });
}
