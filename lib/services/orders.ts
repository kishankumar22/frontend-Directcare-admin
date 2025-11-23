import { apiClient } from '../api';
import { API_ENDPOINTS } from '../api-config';

// --- Address Interface ---
export interface Address {
  firstName: string;
  lastName: string;
  company: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phoneNumber: string | null;
}

// --- Order Item Interface ---
export interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productName: string;
  productSku: string;
  productImageUrl: string | null;
  variantName: string | null;
  productId: string;
  productVariantId: string;
}

// --- Order Interface ---
export interface Order {
  id: string;
  orderNumber: string;
  status: number;
  orderDate: string;
  subtotalAmount: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  notes: string;
  couponCode: string;
  isGuestOrder: boolean;
  customerEmail: string;
  customerPhone: string;
  billingAddress: Address;
  shippingAddress: Address;
  userId: string | null;
  customerName: string;
  orderItems: OrderItem[];
  payments: any[];
  shipments: any[];
  createdAt: string;
  updatedAt: string | null;
}

// --- API Response Interface ---
export interface OrderApiResponse {
  success: boolean;
  message: string;
  data: {
    items: Order[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasPrevious: boolean;
    hasNext: boolean;
  };
  errors: null | string[];
}

// --- Stats Interface ---
export interface OrderStats {
  totalOrders: number;
  pending: number;
  processing: number;
  completed: number;
  cancelled: number;
  totalRevenue: number;
}

// --- Main Service ---
export const ordersService = {
  // Get all orders with pagination
  getAll: (page: number = 1, pageSize: number = 25, config: any = {}) =>
    apiClient.get<OrderApiResponse>(
      `${API_ENDPOINTS.orders}?page=${page}&pageSize=${pageSize}`,
      config
    ),

  // Get order by ID
  getById: (id: string, config: any = {}) =>
    apiClient.get<Order>(`${API_ENDPOINTS.orders}/${id}`, config),

  // Update order status
  updateStatus: (id: string, status: number, config: any = {}) =>
    apiClient.put<Order>(
      `${API_ENDPOINTS.orders}/${id}/status`,
      { status },
      config
    ),

  // Get orders by status
  getByStatus: (status: number, page: number = 1, pageSize: number = 25, config: any = {}) =>
    apiClient.get<OrderApiResponse>(
      `${API_ENDPOINTS.orders}?status=${status}&page=${page}&pageSize=${pageSize}`,
      config
    ),
};
