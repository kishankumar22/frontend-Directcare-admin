import { apiClient } from '../api';
import { API_ENDPOINTS } from '../api-config';

// --- Subscription Interfaces ---
export interface Subscription {
  id: string;
  customerId: string;
  productId: string;
  productVariantId?: string;
  productName: string;
  productSku: string;
  productImageUrl?: string;
  variantName?: string;
  quantity: number;
  price: number;
  discountPercentage: number;
  discountedPrice: number;
  totalSavings: number;
  frequency: number; // 1=Weekly, 2=BiWeekly, 3=Monthly, 4=BiMonthly, 5=Quarterly
  frequencyDisplay: string;
  status: number; // 1=Active, 2=Paused, 3=Cancelled, 4=Expired
  statusDisplay: string;
  startDate: string;
  nextDeliveryDate?: string;
  lastDeliveryDate?: string;
  pausedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  shippingFirstName: string;
  shippingLastName: string;
  shippingFullName: string;
  shippingAddressLine1: string;
  shippingAddressLine2?: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;
  shippingFullAddress: string;
  totalDeliveries: number;
  skippedDeliveries: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: string[] | null;
}

export interface CreateSubscriptionDto {
  productId: string;
  productVariantId?: string;
  quantity: number;
  frequency: number;
  shippingFirstName: string;
  shippingLastName: string;
  shippingAddressLine1: string;
  shippingAddressLine2?: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;
}

export interface UpdateSubscriptionDto {
  quantity: number;
  frequency: number;
  shippingFirstName: string;
  shippingLastName: string;
  shippingAddressLine1: string;
  shippingAddressLine2?: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;
}

export interface CancelSubscriptionDto {
  cancellationReason: string;
}

export interface SubscriptionStats {
  total: number;
  active: number;
  paused: number;
  cancelled: number;
  totalRevenue: number;
}

// --- Main Service ---
export const subscriptionsService = {
  // ✅ Get all subscriptions (Admin)
  getAll: (config: any = {}) =>
    apiClient.get<ApiResponse<Subscription[]>>(
      API_ENDPOINTS.subscriptions,
      config
    ),

  // ✅ Get subscription by ID
  getById: (id: string, config: any = {}) =>
    apiClient.get<ApiResponse<Subscription>>(
      `${API_ENDPOINTS.subscriptions}/${id}`,
      config
    ),

  // ✅ Get subscriptions by customer ID (Admin can view specific customer)
  getByCustomerId: (customerId: string, activeOnly: boolean = false, config: any = {}) =>
    apiClient.get<ApiResponse<Subscription[]>>(
      `${API_ENDPOINTS.subscriptions}/customer/${customerId}?activeOnly=${activeOnly}`,
      config
    ),

  // ✅ Create subscription (mostly customer, but admin can help)
  create: (data: CreateSubscriptionDto, config: any = {}) =>
    apiClient.post<ApiResponse<Subscription>>(
      API_ENDPOINTS.subscriptions,
      data,
      config
    ),

  // ✅ Update subscription (Admin can update)
  update: (id: string, data: UpdateSubscriptionDto, config: any = {}) =>
    apiClient.put<ApiResponse<Subscription>>(
      `${API_ENDPOINTS.subscriptions}/${id}`,
      data,
      config
    ),

  // ✅ Pause subscription (Admin action)
  pause: (id: string, config: any = {}) =>
    apiClient.post<ApiResponse<Subscription>>(
      `${API_ENDPOINTS.subscriptions}/${id}/pause`,
      {},
      config
    ),

  // ✅ Resume subscription (Admin action)
  resume: (id: string, config: any = {}) =>
    apiClient.post<ApiResponse<Subscription>>(
      `${API_ENDPOINTS.subscriptions}/${id}/resume`,
      {},
      config
    ),

  // ✅ Cancel subscription (Admin action)
  cancel: (id: string, data: CancelSubscriptionDto, config: any = {}) =>
    apiClient.post<ApiResponse<Subscription>>(
      `${API_ENDPOINTS.subscriptions}/${id}/cancel`,
      data,
      config
    ),

  // ✅ Skip next delivery (Admin action)
  skip: (id: string, config: any = {}) =>
    apiClient.post<ApiResponse<Subscription>>(
      `${API_ENDPOINTS.subscriptions}/${id}/skip`,
      {},
      config
    ),
};
