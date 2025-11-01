import { apiClient } from '../api';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  categoryId: string;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductDto {
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  categoryId: string;
  stock: number;
}

export const productsService = {
  getAll: () => apiClient.get<Product[]>('/products'),

  getById: (id: string) => apiClient.get<Product>(`/products/${id}`),

  create: (data: CreateProductDto) => apiClient.post<Product>('/products', data),

  update: (id: string, data: Partial<CreateProductDto>) =>
    apiClient.put<Product>(`/products/${id}`, data),

  delete: (id: string) => apiClient.delete<void>(`/products/${id}`),

  getByCategory: (categoryId: string) =>
    apiClient.get<Product[]>(`/products/category/${categoryId}`),
};
