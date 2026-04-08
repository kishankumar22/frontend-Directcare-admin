// lib/services/customers.ts
import { apiClient } from '../api';
import { API_ENDPOINTS } from '../api-config';

export interface Address {
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  orderDate: string;
  subtotalAmount: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  notes?: string;
  deliveryMethod: string;
  billingAddress: Address;
  shippingAddress: Address;
  itemsCount: number;
}

export interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  createdAt: string;
  lastLoginAt?: string;
  isActive: boolean;
  addresses: Address[];
  orders: Order[];
  totalOrders: number;
  accountType?: "Personal" | "Business";
companyName?: string;
companyNumber?: string;
  totalSpent: number;
  tierLevel?: "Gold" | "Silver" | "Bronze"; // ✅ ADD THIS
}

export interface CustomerQueryParams {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  isActive?: boolean;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  tierLevel?: string; // ✅ ADD THIS
}

// ✅ Add Response Interface
interface ApiResponse<T> {
  data: {
    success: boolean;
    data: T;
    message?: string;
  };
}

export interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  newCustomersLast30Days: number;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
}

interface PaginatedResponse {
  items: Customer[];
  stats: CustomerStats; // ✅ ADD THIS
  totalCount: number;
  pageSize: number;
  currentPage: number;
  totalPages: number;
}

export const customersService = {
  getAll: (params?: CustomerQueryParams): Promise<ApiResponse<PaginatedResponse>> =>
    apiClient.get(API_ENDPOINTS.customers, { params }) as Promise<ApiResponse<PaginatedResponse>>,

  getById: (id: string): Promise<ApiResponse<Customer>> =>
    apiClient.get(`${API_ENDPOINTS.customers}/${id}`) as Promise<ApiResponse<Customer>>,

  toggleStatus: (id: string): Promise<ApiResponse<string>> =>
  apiClient.put(`${API_ENDPOINTS.customers}/${id}/toggle-status`) as Promise<ApiResponse<string>>,
};