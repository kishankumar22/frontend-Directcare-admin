// services/activityLog.ts

import { apiClient } from '../api';
import { API_ENDPOINTS } from '../api-config';

// ========== Type Definitions ========== (keep all your existing types)

export interface EntityDetails {
  id: string;
  name?: string;
  shortDescription?: string;
  sku?: string;
  price?: number;
  oldPrice?: number;
  stockQuantity?: number;
  isPublished?: boolean;
  isDeleted?: boolean;
  orderNumber?: string;
  status?: string;
  totalAmount?: number;
  customerEmail?: string;
  orderDate?: string;
}

export interface ActivityLog {
  id: string;
  activityLogType: string;
  activityLogTypeName: string;
  comment: string;
  entityName: string;
  entityId: string;
  createdOnUtc: string;
  userName: string;
  entityDetails: EntityDetails;
}

export interface ActivityLogListResponse {
  items: ActivityLog[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: string[];
}

export interface ActivityLogQueryParams {
  page?: number;
  pageSize?: number;
  createdFrom?: string;
  createdTo?: string;
  activityLogType?: ActivityLogType;
  ipAddress?: string;
  searchTerm?: string;
  sortDirection?: 'asc' | 'desc';
}

export type ActivityLogType =
  | 'AddProduct'
  | 'UpdateProduct'
  | 'DeleteProduct'
  | 'AddCategory'
  | 'UpdateCategory'
  | 'DeleteCategory'
  | 'AddBrand'
  | 'UpdateBrand'
  | 'DeleteBrand'
  | 'AddOrder'
  | 'UpdateOrder'
  | 'CancelOrder'
  | 'CreateShipment'
  | 'AddCustomer'
  | 'UpdateCustomer'
  | 'DeleteCustomer'
  | 'UserLogin'
  | 'UserLogout'
  | 'UserRegister'
  | 'AddBanner'
  | 'UpdateBanner'
  | 'DeleteBanner'
  | 'AddBlogPost'
  | 'UpdateBlogPost'
  | 'DeleteBlogPost'
  | 'AddBlogCategory'
  | 'UpdateBlogCategory'
  | 'DeleteBlogCategory'
  | 'AddBlogComment'
  | 'UpdateBlogComment'
  | 'DeleteBlogComment'
  | 'AddProductReview'
  | 'UpdateProductReview'
  | 'DeleteProductReview'
  | 'RejectProductReview'
  | 'AddDiscount'
  | 'UpdateDiscount'
  | 'DeleteDiscount'
  | 'AddShippingZone'
  | 'UpdateShippingZone'
  | 'DeleteShippingZone'
  | 'AddShippingMethod'
  | 'UpdateShippingMethod'
  | 'DeleteShippingMethod'
  | 'AddVATRate'
  | 'UpdateVATRate'
  | 'DeleteVATRate'
  | 'AddNewsletterSubscription'
  | 'DeleteNewsletterSubscription'
  | 'AddSubscription'
  | 'UpdateSubscription'
  | 'CancelSubscription'
  | 'AddLoyaltyPoints'
  | 'RedeemLoyaltyPoints'
  | 'UpdateSettings'
  | 'Other';

// ========== Service ==========

export const activityLogService = {
  /**
   * Get all activity logs with optional filters and pagination
   */
  getAll: (params?: ActivityLogQueryParams) =>
    apiClient.get<ApiResponse<ActivityLogListResponse>>(
      API_ENDPOINTS.activityLogs.base,
      { params }
    ),

  /**
   * Delete a specific activity log by ID
   */
  deleteById: (id: string) =>
    apiClient.delete<ApiResponse<boolean>>(
      API_ENDPOINTS.activityLogs.delete(id)
    ),

  /**
   * Clear all activity logs
   */
  clearAll: () =>
    apiClient.delete<ApiResponse<boolean>>(
      API_ENDPOINTS.activityLogs.clear
    ),

  /**
   * Get activity logs by entity type
   */
  getByEntity: (entityName: string, params?: Omit<ActivityLogQueryParams, 'entityName'>) => {
    const searchTerm = params?.searchTerm
      ? `${params.searchTerm} ${entityName}`
      : entityName;
    
    return apiClient.get<ApiResponse<ActivityLogListResponse>>(
      API_ENDPOINTS.activityLogs.base,
      { params: { ...params, searchTerm } }
    );
  },

  /**
   * Get activity logs by date range
   */
  getByDateRange: (
    startDate: string,
    endDate: string,
    params?: Omit<ActivityLogQueryParams, 'createdFrom' | 'createdTo'>
  ) =>
    apiClient.get<ApiResponse<ActivityLogListResponse>>(
      API_ENDPOINTS.activityLogs.base,
      { params: { ...params, createdFrom: startDate, createdTo: endDate } }
    ),

  /**
   * Get activity logs by type
   * ✅ FIXED: Map activityType parameter to activityLogType
   */
  getByType: (
    activityType: ActivityLogType,
    params?: Omit<ActivityLogQueryParams, 'activityLogType'>
  ) =>
    apiClient.get<ApiResponse<ActivityLogListResponse>>(
      API_ENDPOINTS.activityLogs.base,
      { params: { ...params, activityLogType: activityType } } // ✅ FIXED
    ),

  /**
   * Get activity logs by user
   */
  getByUser: (userName: string, params?: ActivityLogQueryParams) =>
    apiClient.get<ApiResponse<ActivityLogListResponse>>(
      API_ENDPOINTS.activityLogs.base,
      { params: { ...params, searchTerm: userName } }
    ),
};

export default activityLogService;
