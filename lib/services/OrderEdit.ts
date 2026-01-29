// lib/services/orderEdit.ts

import { apiClient } from '../api';
import { API_ENDPOINTS } from '../api-config';

// ===========================
// TYPES & INTERFACES
// ===========================

export type OperationType = 
  | "UpdateQuantity" 
  | "UpdatePrice" 
  | "RemoveItem" 
  | "AddItem" 
  | "ReplaceItem";

export type RefundReason = 
  | "CustomerRequest" 
  | "ProductDefect" 
  | "WrongItemShipped" 
  | "DamagedInTransit" 
  | "Other";

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
  phoneNumber: string;
}

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

export interface OrderEditRequest {
  orderId: string;
  operations: OrderEditOperation[];
  editReason: string;
  adminNotes?: string;
  recalculateTotals?: boolean;
  adjustInventory?: boolean;
  sendCustomerNotification?: boolean;
  billingAddress?: Address;
  shippingAddress?: Address;
  currentUser?: string;
  ipAddress?: string;
}

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

export interface RegenerateInvoiceRequest {
  orderId: string;
  notes?: string;
  sendToCustomer?: boolean;
  currentUser?: string;
}

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

// ✅ API Response Interface
interface ApiResponse<T = any> {
  success?: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

// ✅ Standard Service Response
interface ServiceResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

// ===========================
// ORDER EDIT SERVICE CLASS
// ===========================

class OrderEditService {
  /**
   * ✅ FIXED: Edit an existing order with proper null/undefined checks
   * PUT /api/Orders/{orderId}/edit
   */
  async editOrder(request: OrderEditRequest): Promise<ServiceResponse> {
    console.log('🔧 Order Edit Request:', {
      orderId: request.orderId,
      operationsCount: request.operations.length,
      hasBillingAddress: !!request.billingAddress,
      hasShippingAddress: !!request.shippingAddress,
      editReason: request.editReason,
    });

    // ✅ USE WRAPPED API CLIENT (returns ApiResponse)
    const response = await apiClient.put<any>(
      `${API_ENDPOINTS.orders}/${request.orderId}/edit`,
      request
    );

    console.log('📥 API Response:', response);

    // ✅ Check for errors from wrapped response
    if (response.error) {
      console.error('❌ Order Edit Failed:', response.error);
      return {
        success: false,
        message: response.error,
      };
    }

    // ✅ Check backend success flag
    const responseData = response.data;
    
    if (responseData?.success === false) {
      console.error('❌ Backend Error:', responseData);
      return {
        success: false,
        message: responseData.message ?? 'Backend returned error',
        errors: responseData.errors,
      };
    }

    console.log('✅ Order Edit Success:', responseData);

    return {
      success: true,
      message: responseData?.message ?? 'Order updated successfully',
      data: responseData?.data,
    };
  }


  /**
   * ✅ FIXED: Process full refund with null checks
   */
  async processFullRefund(request: FullRefundRequest): Promise<ServiceResponse> {
    try {
      const response = await apiClient.post<ApiResponse>(
        `${API_ENDPOINTS.orders}/${request.orderId}/refund`,
        request
      );

      const responseData = response.data;

      return {
        success: responseData?.success ?? true,
        message: responseData?.message ?? 'Refund processed successfully',
        data: responseData?.data,
      };
    } catch (error: any) {
      console.error('❌ Full Refund Error:', error);
      
      const errorData = error.response?.data as ApiResponse | undefined;
      
      return {
        success: false,
        message: errorData?.message ?? 'Failed to process refund',
        errors: errorData?.errors,
      };
    }
  }

  /**
   * ✅ FIXED: Process partial refund with null checks
   */
  async processPartialRefund(request: PartialRefundRequest): Promise<ServiceResponse> {
    try {
      const response = await apiClient.post<ApiResponse>(
        `${API_ENDPOINTS.orders}/${request.orderId}/partial-refund`,
        request
      );

      const responseData = response.data;

      return {
        success: responseData?.success ?? true,
        message: responseData?.message ?? 'Partial refund processed successfully',
        data: responseData?.data,
      };
    } catch (error: any) {
      console.error('❌ Partial Refund Error:', error);
      
      const errorData = error.response?.data as ApiResponse | undefined;

      return {
        success: false,
        message: errorData?.message ?? 'Failed to process partial refund',
        errors: errorData?.errors,
      };
    }
  }

  /**
   * ✅ FIXED: Get refund history with null checks
   */
  async getRefundHistory(orderId: string): Promise<ServiceResponse<RefundHistoryData>> {
    try {
      const response = await apiClient.get<ApiResponse<RefundHistoryData>>(
        `${API_ENDPOINTS.orders}/${orderId}/refund-history`
      );

      const responseData = response.data;

      return {
        success: responseData?.success ?? true,
        message: responseData?.message,
        data: responseData?.data,
      };
    } catch (error: any) {
      console.error('❌ Refund History Error:', error);
      
      const errorData = error.response?.data as ApiResponse | undefined;

      return {
        success: false,
        message: errorData?.message ?? 'Failed to fetch refund history',
      };
    }
  }

  /**
   * ✅ FIXED: Get edit history with null checks
   */
  async getEditHistory(orderId: string): Promise<ServiceResponse<EditHistoryItem[]>> {
    try {
      const response = await apiClient.get<ApiResponse<EditHistoryItem[]>>(
        `${API_ENDPOINTS.orders}/${orderId}/edit-history`
      );

      const responseData = response.data;

      return {
        success: responseData?.success ?? true,
        message: responseData?.message,
        data: responseData?.data,
      };
    } catch (error: any) {
      console.error('❌ Edit History Error:', error);
      
      const errorData = error.response?.data as ApiResponse | undefined;

      return {
        success: false,
        message: errorData?.message ?? 'Failed to fetch edit history',
      };
    }
  }

  /**
   * ✅ FIXED: Regenerate invoice with null checks
   */
  async regenerateInvoice(request: RegenerateInvoiceRequest): Promise<ServiceResponse> {
    try {
      const response = await apiClient.post<ApiResponse>(
        `${API_ENDPOINTS.orders}/${request.orderId}/regenerate-invoice`,
        request
      );

      const responseData = response.data;

      return {
        success: responseData?.success ?? true,
        message: responseData?.message ?? 'Invoice regenerated successfully',
        data: responseData?.data,
      };
    } catch (error: any) {
      console.error('❌ Regenerate Invoice Error:', error);
      
      const errorData = error.response?.data as ApiResponse | undefined;

      return {
        success: false,
        message: errorData?.message ?? 'Failed to regenerate invoice',
      };
    }
  }

  /**
   * ✅ Helper: Validate and clean address data
   */
  validateAndCleanAddress(address: Partial<Address>): Address | undefined {
    // Check if address has required fields with actual values
    if (
      !address.firstName?.trim() ||
      !address.lastName?.trim() ||
      !address.addressLine1?.trim() ||
      !address.city?.trim() ||
      !address.state?.trim() ||
      !address.postalCode?.trim() ||
      !address.country?.trim() ||
      !address.phoneNumber?.trim()
    ) {
      return undefined;
    }

    return {
      firstName: address.firstName.trim(),
      lastName: address.lastName.trim(),
      company: address.company?.trim() || undefined,
      addressLine1: address.addressLine1.trim(),
      addressLine2: address.addressLine2?.trim() || undefined,
      city: address.city.trim(),
      state: address.state.trim(),
      postalCode: address.postalCode.trim(),
      country: address.country.trim(),
      phoneNumber: address.phoneNumber.trim(),
    };
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
