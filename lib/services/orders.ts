import { apiClient } from '../api';

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderDto {
  customerId: string;
  items: OrderItem[];
}

export const ordersService = {
  getAll: () => apiClient.get<Order[]>('/orders'),

  getById: (id: string) => apiClient.get<Order>(`/orders/${id}`),

  create: (data: CreateOrderDto) => apiClient.post<Order>('/orders', data),

  updateStatus: (id: string, status: Order['status']) =>
    apiClient.put<Order>(`/orders/${id}/status`, { status }),

  delete: (id: string) => apiClient.delete<void>(`/orders/${id}`),

  getByCustomer: (customerId: string) =>
    apiClient.get<Order[]>(`/orders/customer/${customerId}`),
};
