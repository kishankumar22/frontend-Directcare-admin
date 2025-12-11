// lib/services/orderService.ts

import { apiClient } from '../api';
import { API_ENDPOINTS } from '../api-config';

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
  status: number;
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
  status: number;
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
  deliveryMethod: string;
  clickAndCollectFee?: number;
  collectionStatus?: string;
  readyForCollectionAt?: string;
  collectedAt?: string;
  collectedBy?: string;
  collectorIDType?: string;
  collectionExpiryDate?: string;
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

// ✅ API Response wrapper
 interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: string[];
}

// Request DTOs
export interface MarkCollectedRequest {
  orderId: string;
  collectedBy: string;
  collectorIDType: string;
  collectorIDNumber: string;
}

export interface UpdateStatusRequest {
  orderId: string;
  newStatus: number;
  adminNotes?: string;
}

export interface CreateShipmentRequest {
  orderId: string;
  trackingNumber: string;
  carrier: string;
  shippingMethod: string;
  notes?: string;
  shipmentItems: {
    orderItemId: string;
    quantity: number;
  }[];
}

export interface MarkDeliveredRequest {
  orderId: string;
  shipmentId: string;
  deliveredAt: string;
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

// ==================== SERVICE METHODS ====================

class OrderService {
  /**
   * Get all orders with filters
   */
  async getAllOrders(params?: {
    page?: number;
    pageSize?: number;
    status?: number;
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

  /**
   * Get order by ID
   */
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

  /**
   * Track order by order number
   */
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

  /**
   * Get click and collect orders
   */
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

  /**
   * Mark order as ready for collection
   */
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

  /**
   * Mark order as collected
   */
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

  /**
   * Update order status
   */
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

  /**
   * Create shipment
   */
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

  /**
   * Mark order as delivered
   */
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

  /**
   * Cancel order
   */
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
 * Get status label and color
 */
export const getOrderStatusInfo = (status: number) => {
  const statusMap: Record<number, { label: string; color: string; bgColor: string }> = {
    1: { label: 'Pending', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
    2: { label: 'Processing', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
    3: { label: 'Shipped', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
    4: { label: 'Delivered', color: 'text-green-400', bgColor: 'bg-green-500/10' },
    5: { label: 'Cancelled', color: 'text-red-400', bgColor: 'bg-red-500/10' },
    6: { label: 'Refunded', color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
    7: { label: 'Ready for Collection', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
    8: { label: 'Collected', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  };
  return statusMap[status] || { label: 'Unknown', color: 'text-gray-400', bgColor: 'bg-gray-500/10' };
};

/**
 * Get payment status label
 */
export const getPaymentStatusLabel = (status: number) => {
  const statusMap: Record<number, string> = {
    1: 'Pending',
    2: 'Processing',
    3: 'Completed',
    4: 'Failed',
    5: 'Refunded',
  };
  return statusMap[status] || 'Unknown';
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
