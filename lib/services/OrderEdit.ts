// lib/services/orderEdit.ts

import { apiClient } from '../api';
import { API_ENDPOINTS } from '../api-config';

// ===========================
// TYPES & INTERFACES
// ===========================

/**
 * Operation types for order editing
 */
export type OperationType = 
  | "UpdateQuantity" 
  | "UpdatePrice" 
  | "RemoveItem" 
  | "AddItem" 
  | "ReplaceItem";

/**
 * Refund reasons
 */
export type RefundReason = 
  | "CustomerRequest" 
  | "ProductDefect" 
  | "WrongItemShipped" 
  | "DamagedInTransit" 
  | "Other";

/**
 * Order edit operation
 */
export interface OrderEditOperation {
  operationType: OperationType;
  orderItemId?: string;
  productId?: string;
  productVariantId?: string;
  newQuantity?: number;
  newUnitPrice?: number;
  replacementProductId?: string;
  replacementProductVariantId?: string;
}

/**
 * Order edit request payload
 */
export interface OrderEditRequest {
  orderId: string;
  operations: OrderEditOperation[];
  editReason: string;
  adminNotes?: string;
  recalculateTotals?: boolean;
  adjustInventory?: boolean;
  sendCustomerNotification?: boolean;
  currentUser?: string;
  ipAddress?: string;
}

/**
 * Full refund request
 */
export interface FullRefundRequest {
  orderId: string;
  reason: RefundReason;
  reasonDetails?: string;
  adminNotes?: string;
  restoreInventory?: boolean;
  sendCustomerNotification?: boolean;
  currentUser?: string;
  ipAddress?: string;
}

/**
 * Partial refund request
 */
export interface PartialRefundRequest {
  orderId: string;
  refundAmount: number;
  reason: RefundReason;
  reasonDetails?: string;
  adminNotes?: string;
  sendCustomerNotification?: boolean;
  currentUser?: string;
  ipAddress?: string;
}

/**
 * Regenerate invoice request
 */
export interface RegenerateInvoiceRequest {
  orderId: string;
  notes?: string;
  sendToCustomer?: boolean;
  currentUser?: string;
}

/**
 * Refund item
 */
export interface RefundItem {
  refundId: string;
  amount: number;
  currency: string;
  reason: string;
  reasonDetails?: string;
  processedBy: string;
  processedAt: string;
  isPartial: boolean;
}

/**
 * Refund history response
 */
export interface RefundHistoryData {
  orderId: string;
  orderNumber: string;
  originalOrderAmount: number;
  totalRefunded: number;
  remainingBalance: number;
  isFullyRefunded: boolean;
  paymentStatus: string;
  refunds: RefundItem[];
}

/**
 * Edit history item
 */
export interface EditHistoryItem {
  id: string;
  orderId: string;
  changeType: string;
  changedBy: string;
  changeDate: string;
  changeDetails: string;
  oldSubtotal: number;
  newSubtotal: number;
  oldTaxAmount: number;
  newTaxAmount: number;
  oldShippingAmount: number;
  newShippingAmount: number;
  oldTotalAmount: number;
  newTotalAmount: number;
  oldStatus: string;
  newStatus: string;
  notes?: string;
}

/**
 * Standard API response wrapper
 */
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: string[];
}

// ===========================
// ORDER EDIT SERVICE CLASS
// ===========================

class OrderEditService {
  /**
   * Edit an existing order
   * PUT /api/orders/{orderId}/edit
   */
  async editOrder(request: OrderEditRequest) {
    try {
      const response = await apiClient.put<ApiResponse<any>>(
        `${API_ENDPOINTS.orders}/${request.orderId}/edit`,
        request
      );
      return response.data;
    } catch (error: any) {
      console.error("❌ Order Edit Error:", error);
      throw new Error(
        error.response?.data?.message || 
        error.response?.data?.errors?.[0] || 
        'Failed to edit order'
      );
    }
  }

  /**
   * Process full refund for an order
   * POST /api/orders/{orderId}/refund
   */
  async processFullRefund(request: FullRefundRequest) {
    try {
      const response = await apiClient.post<ApiResponse<any>>(
        `${API_ENDPOINTS.orders}/${request.orderId}/refund`,
        request
      );
      return response.data;
    } catch (error: any) {
      console.error("❌ Full Refund Error:", error);
      throw new Error(
        error.response?.data?.message || 
        error.response?.data?.errors?.[0] || 
        'Failed to process refund'
      );
    }
  }

  /**
   * Process partial refund for an order
   * POST /api/orders/{orderId}/partial-refund
   */
  async processPartialRefund(request: PartialRefundRequest) {
    try {
      const response = await apiClient.post<ApiResponse<any>>(
        `${API_ENDPOINTS.orders}/${request.orderId}/partial-refund`,
        request
      );
      return response.data;
    } catch (error: any) {
      console.error("❌ Partial Refund Error:", error);
      throw new Error(
        error.response?.data?.message || 
        error.response?.data?.errors?.[0] || 
        'Failed to process partial refund'
      );
    }
  }

  /**
   * Get refund history for an order
   * GET /api/orders/{orderId}/refund-history
   */
  async getRefundHistory(orderId: string) {
    try {
      const response = await apiClient.get<ApiResponse<RefundHistoryData>>(
        `${API_ENDPOINTS.orders}/${orderId}/refund-history`
      );
      return response.data;
    } catch (error: any) {
      console.error("❌ Refund History Error:", error);
      throw new Error(
        error.response?.data?.message || 
        error.response?.data?.errors?.[0] || 
        'Failed to fetch refund history'
      );
    }
  }

  /**
   * Get edit history for an order
   * GET /api/orders/{orderId}/edit-history
   */
  async getEditHistory(orderId: string) {
    try {
      const response = await apiClient.get<ApiResponse<EditHistoryItem[]>>(
        `${API_ENDPOINTS.orders}/${orderId}/edit-history`
      );
      return response.data;
    } catch (error: any) {
      console.error("❌ Edit History Error:", error);
      throw new Error(
        error.response?.data?.message || 
        error.response?.data?.errors?.[0] || 
        'Failed to fetch edit history'
      );
    }
  }

  /**
   * Regenerate invoice for an order
   * POST /api/orders/{orderId}/regenerate-invoice
   */
  async regenerateInvoice(request: RegenerateInvoiceRequest) {
    try {
      const response = await apiClient.post<ApiResponse<any>>(
        `${API_ENDPOINTS.orders}/${request.orderId}/regenerate-invoice`,
        request
      );
      return response.data;
    } catch (error: any) {
      console.error("❌ Regenerate Invoice Error:", error);
      throw new Error(
        error.response?.data?.message || 
        error.response?.data?.errors?.[0] || 
        'Failed to regenerate invoice'
      );
    }
  }

  /**
   * Helper: Create update quantity operation
   */
  createUpdateQuantityOperation(
    orderItemId: string,
    newQuantity: number
  ): OrderEditOperation {
    return {
      operationType: "UpdateQuantity",
      orderItemId,
      newQuantity,
    };
  }

  /**
   * Helper: Create update price operation
   */
  createUpdatePriceOperation(
    orderItemId: string,
    newUnitPrice: number
  ): OrderEditOperation {
    return {
      operationType: "UpdatePrice",
      orderItemId,
      newUnitPrice,
    };
  }

  /**
   * Helper: Create remove item operation
   */
  createRemoveItemOperation(orderItemId: string): OrderEditOperation {
    return {
      operationType: "RemoveItem",
      orderItemId,
    };
  }

  /**
   * Helper: Create add item operation
   */
  createAddItemOperation(
    productId: string,
    quantity: number,
    unitPrice: number,
    productVariantId?: string
  ): OrderEditOperation {
    return {
      operationType: "AddItem",
      productId,
      productVariantId,
      newQuantity: quantity,
      newUnitPrice: unitPrice,
    };
  }

  /**
   * Helper: Create replace item operation
   */
  createReplaceItemOperation(
    orderItemId: string,
    replacementProductId: string,
    replacementProductVariantId?: string
  ): OrderEditOperation {
    return {
      operationType: "ReplaceItem",
      orderItemId,
      replacementProductId,
      replacementProductVariantId,
    };
  }
}

// Export singleton instance
export const orderEditService = new OrderEditService();
