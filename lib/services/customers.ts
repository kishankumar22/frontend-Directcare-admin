import { apiClient } from '../api';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerDto {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export const customersService = {
  getAll: () => apiClient.get<Customer[]>('/customers'),

  getById: (id: string) => apiClient.get<Customer>(`/customers/${id}`),

  create: (data: CreateCustomerDto) => apiClient.post<Customer>('/customers', data),

  update: (id: string, data: Partial<CreateCustomerDto>) =>
    apiClient.put<Customer>(`/customers/${id}`, data),

  delete: (id: string) => apiClient.delete<void>(`/customers/${id}`),
};
