// lib/services/orderService.ts

import { apiClient } from '../api';
import { API_ENDPOINTS } from '../api-config';

// ==================== ENUMS & TYPES ====================

/**
 * ✅ Order Status (Backend returns strings now)
 */
export type OrderStatus = 
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | 'Refunded'
  | 'PartiallyShipped'
  | 'Returned';

/**
 * ✅ Collection Status
 */
export type CollectionStatus = 'Pending' | 'Ready' | 'Collected' | 'Expired';

/**
 * ✅ Delivery Method
 */
export type DeliveryMethod = 'HomeDelivery' | 'ClickAndCollect';

/**
 * ✅ Payment Status (Backend returns strings)
 */
export type PaymentStatus =
  | 'Pending'
  | 'Authorized'
  | 'Processing'
  | 'Successful'
  | 'Completed'
  | 'Captured'
  | 'Failed'
  | 'Cancelled'
  | 'Refunded'
  | 'PartiallyRefunded';

// ==================== INTERFACES ====================

export interface Address {
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phoneNumber?: string;
}

export interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productName: string;
  productSku: string;
  productImageUrl?: string;
  variantName?: string;
  productId: string;
  productVariantId?: string;
}

export interface Payment {
  id: string;
  paymentMethod: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  transactionId?: string;
  gatewayTransactionId?: string;
  processedAt?: string;
  failureReason?: string;
  createdAt: string;
}

export interface ShipmentItem {
  id: string;
  quantity: number;
  orderItemId: string;
  orderItem?: OrderItem;
}

export interface Shipment {
  id: string;
  trackingNumber?: string;
  carrier?: string;
  shippingMethod?: string;
  shippingCost?: number;
  shippedAt?: string;
  deliveredAt?: string;
  notes?: string;
  createdAt: string;
  shipmentItems: ShipmentItem[];
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  orderDate: string;
  estimatedDispatchDate?: string;
  dispatchedAt?: string;
  dispatchNote?: string;
  subtotalAmount: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  notes?: string;
  couponCode?: string;
  isGuestOrder: boolean;
  subscriptionId?: string;
  customerEmail: string;
  customerPhone?: string;
  billingAddress: Address;
  shippingAddress: Address;
  userId?: string;
  customerName: string;
  deliveryMethod: DeliveryMethod;
  clickAndCollectFee?: number;
  collectionStatus?: CollectionStatus;
  readyForCollectionAt?: string;
  collectedAt?: string;
  collectedBy?: string;
  collectorIDType?: string;
  collectionExpiryDate?: string;

  // Payment summary fields (from backend OrderDto)
  paymentMethod?: string;
  paymentStatus?: string;

  orderItems: OrderItem[];
  payments: Payment[];
  shipments: Shipment[];
  createdAt: string;
  updatedAt?: string;
}

export interface OrdersListResponse {
  items: Order[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: string[];
}

// ==================== REQUEST DTOs ====================

export interface MarkCollectedRequest {
  orderId: string;
  collectedBy: string;
  collectorIDType: string;
  collectorIDNumber: string;
}

export interface UpdateStatusRequest {
  orderId: string;
  newStatus: OrderStatus;
  adminNotes?: string;
}

export interface CreateShipmentRequest {
  orderId: string;
  trackingNumber: string;
  carrier: string;
  shippingMethod: string;
  notes?: string;
  shipmentItems?: {
    orderItemId: string;
    quantity: number;
  }[] | null;
}

export interface MarkDeliveredRequest {
  orderId: string;
  shipmentId?: string;
  deliveredAt?: string;
  deliveryNotes?: string;
  receivedBy?: string;
}

export interface CancelOrderRequest {
  orderId: string;
  cancellationReason: string;
  restoreInventory: boolean;
  initiateRefund: boolean;
  cancelledBy: string;
}

// ==================== SERVICE CLASS ====================

class OrderService {
  async getAllOrders(params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    fromDate?: string;
    toDate?: string;
    searchTerm?: string;
  }) {
    try {
      const response = await apiClient.get<ApiResponse<OrdersListResponse>>(
        API_ENDPOINTS.orders,
        { params }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch orders');
    }
  }

  async getOrderById(orderId: string) {
    try {
      const response = await apiClient.get<ApiResponse<Order>>(
        `${API_ENDPOINTS.orders}/${orderId}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch order details');
    }
  }

  async trackOrder(orderNumber: string, email?: string) {
    try {
      const response = await apiClient.get<ApiResponse<Order>>(
        `${API_ENDPOINTS.orders}/track/${orderNumber}`,
        { params: { email } }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to track order');
    }
  }

  async getClickAndCollectOrders(params?: {
    pageNumber?: number;
    pageSize?: number;
    collectionStatus?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    try {
      const response = await apiClient.get<ApiResponse<OrdersListResponse>>(
        `${API_ENDPOINTS.orders}/click-and-collect`,
        { params }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch click & collect orders');
    }
  }

  async markReady(orderId: string) {
    try {
      const response = await apiClient.post<ApiResponse<Order>>(
        `${API_ENDPOINTS.orders}/${orderId}/mark-ready`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to mark order as ready');
    }
  }

  async markCollected(data: MarkCollectedRequest) {
    try {
      const response = await apiClient.post<ApiResponse<Order>>(
        `${API_ENDPOINTS.orders}/${data.orderId}/mark-collected`,
        data
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to mark order as collected');
    }
  }

  async updateStatus(data: UpdateStatusRequest) {
    try {
      const response = await apiClient.put<ApiResponse<Order>>(
        `${API_ENDPOINTS.orders}/${data.orderId}/status`,
        data
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update order status');
    }
  }

  async createShipment(data: CreateShipmentRequest) {
    try {
      const response = await apiClient.post<ApiResponse<Shipment>>(
        `${API_ENDPOINTS.orders}/${data.orderId}/shipment`,
        data
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create shipment');
    }
  }

  async markDelivered(data: MarkDeliveredRequest) {
    try {
      const response = await apiClient.post<ApiResponse<Order>>(
        `${API_ENDPOINTS.orders}/${data.orderId}/delivered`,
        data
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to mark order as delivered');
    }
  }

  async cancelOrder(data: CancelOrderRequest) {
    try {
      const response = await apiClient.post<ApiResponse<Order>>(
        `${API_ENDPOINTS.orders}/${data.orderId}/cancel`,
        data
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to cancel order');
    }
  }
}

export const orderService = new OrderService();

// ==================== HELPER FUNCTIONS ====================

/**
 * ✅ Get Order Status Info (String-based)
 */
export const getOrderStatusInfo = (status: OrderStatus) => {
  const statusMap: Record<OrderStatus, { label: string; color: string; bgColor: string }> = {
    'Pending': { label: 'Pending', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
    'Confirmed': { label: 'Confirmed', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
    'Processing': { label: 'Processing', color: 'text-indigo-400', bgColor: 'bg-indigo-500/10' },
    'Shipped': { label: 'Shipped', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
    'PartiallyShipped': { label: 'Partially Shipped', color: 'text-purple-300', bgColor: 'bg-purple-400/10' },
    'Delivered': { label: 'Delivered', color: 'text-green-400', bgColor: 'bg-green-500/10' },
    'Cancelled': { label: 'Cancelled', color: 'text-red-400', bgColor: 'bg-red-500/10' },
    'Returned': { label: 'Returned', color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
    'Refunded': { label: 'Refunded', color: 'text-pink-400', bgColor: 'bg-pink-500/10' },
  };
  return statusMap[status] || { label: 'Unknown', color: 'text-gray-400', bgColor: 'bg-gray-500/10' };
};

/**
 * ✅ Get Collection Status Info
 */
export const getCollectionStatusInfo = (status: CollectionStatus) => {
  const statusMap: Record<CollectionStatus, { label: string; color: string; bgColor: string }> = {
    'Pending': { label: 'Pending Collection', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
    'Ready': { label: 'Ready for Pickup', color: 'text-green-400', bgColor: 'bg-green-500/10' },
    'Collected': { label: 'Collected', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
    'Expired': { label: 'Expired', color: 'text-red-400', bgColor: 'bg-red-500/10' },
  };
  return statusMap[status] || statusMap['Pending'];
};

/**
 * ✅ Get Payment Status Info (Updated with "Successful")
 */
export const getPaymentStatusInfo = (status: PaymentStatus) => {
  const statusMap: Record<PaymentStatus, { label: string; color: string; bgColor: string }> = {
    'Pending': { label: 'Pending', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
    'Authorized': { label: 'Authorized', color: 'text-blue-300', bgColor: 'bg-blue-400/10' },
    'Processing': { label: 'Processing', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
    'Successful': { label: 'Successful', color: 'text-green-400', bgColor: 'bg-green-500/10' },
    'Completed': { label: 'Completed', color: 'text-green-400', bgColor: 'bg-green-500/10' },
    'Captured': { label: 'Captured', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
    'Failed': { label: 'Failed', color: 'text-red-400', bgColor: 'bg-red-500/10' },
    'Cancelled': { label: 'Cancelled', color: 'text-red-300', bgColor: 'bg-red-400/10' },
    'Refunded': { label: 'Refunded', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
    'PartiallyRefunded': { label: 'Partially Refunded', color: 'text-purple-300', bgColor: 'bg-purple-400/10' },
  };
  return statusMap[status] || statusMap['Pending'];
};

/**
 * Get Payment Method Info
 */
export const getPaymentMethodInfo = (method?: string | null) => {
  if (!method) return { label: 'N/A', color: 'text-slate-400', bgColor: 'bg-slate-500/10', icon: 'cash' as const };

  const normalized = method.toLowerCase();
  if (normalized === 'stripe') {
    return { label: 'Stripe', color: 'text-indigo-400', bgColor: 'bg-indigo-500/10', icon: 'card' as const };
  }
  return { label: 'Cash on Delivery', color: 'text-amber-400', bgColor: 'bg-amber-500/10', icon: 'cash' as const };
};

/**
 * Format currency
 */
export const formatCurrency = (amount: number, currency: string = 'GBP') => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(amount);
};

/**
 * Format date
 */
export const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
