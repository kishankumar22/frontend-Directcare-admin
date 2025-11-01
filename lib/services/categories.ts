import { apiClient } from '../api';

export interface Category {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryDto {
  name: string;
  description: string;
}

export const categoriesService = {
  getAll: () => apiClient.get<Category[]>('/categories'),

  getById: (id: string) => apiClient.get<Category>(`/categories/${id}`),

  create: (data: CreateCategoryDto) => apiClient.post<Category>('/categories', data),

  update: (id: string, data: Partial<CreateCategoryDto>) =>
    apiClient.put<Category>(`/categories/${id}`, data),

  delete: (id: string) => apiClient.delete<void>(`/categories/${id}`),
};
