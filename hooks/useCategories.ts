import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '../lib/apiClient';

// Category type
export interface Category {
  id: number;
  name: string;
  type: string;
  icon: string;
  color: string;
  isDefault?: boolean;
}

// Get all categories
export function useCategories(type?: string) {
  return useQuery({
    queryKey: ['/api/categories', type],
    queryFn: async () => {
      let endpoint = '/api/categories';
      if (type) {
        endpoint += `?type=${type}`;
      }
      const data = await apiRequest<Category[]>('GET', endpoint);
      return data;
    },
  });
}

// Get a single category
export function useCategory(id: number) {
  return useQuery({
    queryKey: ['/api/categories', id],
    queryFn: async () => {
      const data = await apiRequest<Category>('GET', `/api/categories/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

// Create a new category
export function useCreateCategory() {
  return useMutation({
    mutationFn: async (newCategory: Omit<Category, 'id'>) => {
      const data = await apiRequest<Category>('POST', '/api/categories', newCategory);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
    },
    onError: (error: Error) => {
      console.error('Error creating category:', error.message);
    },
  });
}

// Update an existing category
export function useUpdateCategory() {
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Category> & { id: number }) => {
      const data = await apiRequest<Category>('PATCH', `/api/categories/${id}`, updates);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories', variables.id] });
    },
    onError: (error: Error) => {
      console.error('Error updating category:', error.message);
    },
  });
}

// Delete a category
export function useDeleteCategory() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/categories/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories', id] });
    },
    onError: (error: Error) => {
      console.error('Error deleting category:', error.message);
    },
  });
}