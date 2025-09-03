import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiRequest } from '../lib/apiClient';

export interface Budget {
  id: number;
  categoryId: number | null;
  amount: number;
  spent?: number;
  month: number;
  year: number;
  category?: {
    name: string;
    icon: string;
    color: string;
  };
}

export interface BudgetData {
    id?: number;
    categoryId: number | null;
    amount: number;
    month: number;
    year: number;
}


async function fetchBudgets(month: number, year: number): Promise<Budget[]> {
  return apiRequest<Budget[]>('GET', `/api/budgets?month=${month}&year=${year}`);
}

export function useBudgets(month: number, year: number) {
  return useQuery<Budget[], Error>(
    ['budgets', month, year],
    () => fetchBudgets(month, year)
  );
}

export function useAddBudget() {
    const queryClient = useQueryClient();
    return useMutation((budget: BudgetData) => apiRequest('POST', '/api/budgets', budget), {
      onSuccess: () => {
        queryClient.invalidateQueries('budgets');
      },
    });
}

export function useUpdateBudget() {
    const queryClient = useQueryClient();
    return useMutation((budget: BudgetData) => apiRequest('PUT', `/api/budgets/${budget.id}`, budget), {
      onSuccess: () => {
        queryClient.invalidateQueries('budgets');
      },
    });
}

export function useDeleteBudget() {
    const queryClient = useQueryClient();
    return useMutation((id: number) => apiRequest('DELETE', `/api/budgets/${id}`), {
      onSuccess: () => {
        queryClient.invalidateQueries('budgets');
      },
    });
}
