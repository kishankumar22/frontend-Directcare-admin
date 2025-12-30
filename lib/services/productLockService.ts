// lib/services/productLock.service.ts
import { apiClient } from '../api';
import { API_ENDPOINTS } from '../api-config';

// ==========================================
// LOCK & TAKEOVER INTERFACES
// ==========================================

export interface ProductLockData {
  id: string;
  productId: string;
  lockedBy: string;
  lockedByEmail: string;
  lockedAt: string;
  expiresAt: string;
  isLocked: boolean;
}

export interface ProductLockStatusData {
  productId: string;
  isLocked: boolean;
  lockedBy?: string;
  lockedByEmail?: string;
  lockedAt?: string;
  expiresAt?: string;
  hasPendingTakeoverRequest?: boolean;
  canRequestTakeover?: boolean;
  cannotRequestReason?: string;
}

export interface TakeoverRequestData {
  id: string;
  productId: string;
  productName: string;
  requestedByUserId: string;
  requestedByEmail: string;
  currentEditorUserId: string;
  currentEditorEmail: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Expired' | 'Cancelled';
  statusText: string;
  requestMessage?: string;
  responseMessage?: string;
  requestedAt: string;
  respondedAt?: string;
  expiresAt: string;
  isActive: boolean;
  isExpired: boolean;
  timeLeftSeconds: number;
}

export interface RequestTakeoverDto {
  requestMessage?: string;
  expiryMinutes?: number;
}

export interface RespondToTakeoverDto {
  responseMessage?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// ==========================================
// PRODUCT LOCK SERVICE
// ==========================================

export const productLockService = {
  
  // ==========================================
  // 🔒 LOCK MANAGEMENT
  // ==========================================

  /**
   * Acquire lock on product for editing
   * POST /api/Products/{productId}/lock?durationMinutes=15
   */
  acquireLock: async (productId: string, durationMinutes: number = 15) => {
    try {
      const response = await apiClient.post<ApiResponse<ProductLockData>>(
        `${API_ENDPOINTS.products}/${productId}/lock?durationMinutes=${durationMinutes}`
      );
      
      if (!response.data) {
        throw new Error('No response data received');
      }
      
      return response.data;
    } catch (error: any) {
      // Handle 409 Conflict (already locked)
      if (error.response?.status === 409) {
        const lockData = error.response.data;
        throw {
          status: 409,
          message: lockData.message || 'Product is locked by another user',
          lockedBy: lockData.lockedBy,
          lockedByEmail: lockData.lockedByEmail,
          expiresAt: lockData.expiresAt,
        };
      }
      throw error;
    }
  },

  /**
   * Release lock on product
   * DELETE /api/Products/{productId}/lock
   */
  releaseLock: async (productId: string) => {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(
        `${API_ENDPOINTS.products}/${productId}/lock`
      );
      
      if (!response.data) {
        throw new Error('No response data received');
      }
      
      return response.data;
    } catch (error) {
      console.error('Failed to release lock:', error);
      throw error;
    }
  },

  /**
   * Get lock status of product
   * GET /api/Products/{productId}/lock-status
   */
  getLockStatus: async (productId: string) => {
    try {
      const response = await apiClient.get<ApiResponse<ProductLockStatusData>>(
        `${API_ENDPOINTS.products}/${productId}/lock-status`
      );
      
      if (!response.data || !response.data.data) {
        throw new Error('Invalid response format');
      }
      
      return response.data;
    } catch (error) {
      console.error('Failed to get lock status:', error);
      throw error;
    }
  },

  // ==========================================
  // 🔄 TAKEOVER REQUEST MANAGEMENT
  // ==========================================

  /**
   * Request takeover of locked product
   * POST /api/Products/{productId}/request-takeover
   */
  requestTakeover: async (productId: string, data: RequestTakeoverDto) => {
    try {
      const response = await apiClient.post<ApiResponse<TakeoverRequestData>>(
        `${API_ENDPOINTS.products}/${productId}/request-takeover`,
        {
          requestMessage: data.requestMessage || '',
          expiryMinutes: data.expiryMinutes || 10
        }
      );
      
      if (!response.data || !response.data.data) {
        throw new Error('Invalid response format');
      }
      
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Failed to request takeover';
      throw new Error(errorMsg);
    }
  },

  /**
   * Get pending takeover requests for current user (as editor)
   * GET /api/Products/pending-takeover-requests
   */
  getPendingTakeoverRequests: async () => {
    try {
      const response = await apiClient.get<ApiResponse<TakeoverRequestData[]>>(
        `${API_ENDPOINTS.products}/pending-takeover-requests`
      );
      
      if (!response.data || !response.data.data) {
        return { success: true, data: [] } as ApiResponse<TakeoverRequestData[]>;
      }
      
      return response.data;
    } catch (error) {
      console.error('Failed to fetch pending requests:', error);
      return { success: false, data: [] } as ApiResponse<TakeoverRequestData[]>;
    }
  },

  /**
   * Get my takeover requests (as requester)
   * GET /api/Products/my-takeover-requests?onlyActive=true
   */
  getMyTakeoverRequests: async (onlyActive: boolean = true) => {
    try {
      const response = await apiClient.get<ApiResponse<TakeoverRequestData[]>>(
        `${API_ENDPOINTS.products}/my-takeover-requests?onlyActive=${onlyActive}`
      );
      
      if (!response.data || !response.data.data) {
        return { success: true, data: [] } as ApiResponse<TakeoverRequestData[]>;
      }
      
      return response.data;
    } catch (error) {
      console.error('Failed to fetch my requests:', error);
      return { success: false, data: [] } as ApiResponse<TakeoverRequestData[]>;
    }
  },

  /**
   * Approve takeover request (releases lock)
   * POST /api/Products/takeover-requests/{requestId}/approve
   */
  approveTakeoverRequest: async (requestId: string, responseMessage?: string) => {
    try {
      const response = await apiClient.post<ApiResponse<TakeoverRequestData>>(
        `${API_ENDPOINTS.products}/takeover-requests/${requestId}/approve`,
        {
          responseMessage: responseMessage || 'Approved'
        }
      );
      
      if (!response.data || !response.data.data) {
        throw new Error('Invalid response format');
      }
      
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Failed to approve takeover';
      throw new Error(errorMsg);
    }
  },

  /**
   * Reject takeover request (keeps lock)
   * POST /api/Products/takeover-requests/{requestId}/reject
   */
  rejectTakeoverRequest: async (requestId: string, responseMessage?: string) => {
    try {
      const response = await apiClient.post<ApiResponse<TakeoverRequestData>>(
        `${API_ENDPOINTS.products}/takeover-requests/${requestId}/reject`,
        {
          responseMessage: responseMessage || 'Rejected'
        }
      );
      
      if (!response.data || !response.data.data) {
        throw new Error('Invalid response format');
      }
      
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Failed to reject takeover';
      throw new Error(errorMsg);
    }
  },

  /**
   * Cancel own takeover request
   * POST /api/Products/takeover-requests/{requestId}/cancel
   */
  cancelTakeoverRequest: async (requestId: string) => {
    try {
      const response = await apiClient.post<ApiResponse<TakeoverRequestData>>(
        `${API_ENDPOINTS.products}/takeover-requests/${requestId}/cancel`
      );
      
      if (!response.data || !response.data.data) {
        throw new Error('Invalid response format');
      }
      
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Failed to cancel request';
      throw new Error(errorMsg);
    }
  },
};

// ==========================================
// 🔒 LOCK HELPER FUNCTIONS
// ==========================================

export const lockHelpers = {
  /**
   * Format time left in human-readable format
   */
  formatTimeLeft: (seconds: number): string => {
    if (seconds <= 0) return 'Expired';
    
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  },

  /**
   * Check if lock is expiring soon (default: 2 minutes)
   */
  isLockExpiringSoon: (expiresAt: string, thresholdMinutes: number = 2): boolean => {
    const expiryTime = new Date(expiresAt).getTime();
    const now = new Date().getTime();
    const diffMinutes = (expiryTime - now) / 1000 / 60;
    
    return diffMinutes > 0 && diffMinutes <= thresholdMinutes;
  },

  /**
   * Get status badge color based on takeover request status
   */
  getStatusColor: (status: TakeoverRequestData['status']): string => {
    const colors = {
      Pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      Approved: 'bg-green-100 text-green-800 border-green-300',
      Rejected: 'bg-red-100 text-red-800 border-red-300',
      Expired: 'bg-gray-100 text-gray-800 border-gray-300',
      Cancelled: 'bg-slate-100 text-slate-600 border-slate-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  },

  /**
   * Get status text color for Tailwind classes
   */
  getStatusTextColor: (status: TakeoverRequestData['status']): string => {
    const colors = {
      Pending: 'text-yellow-600',
      Approved: 'text-green-600',
      Rejected: 'text-red-600',
      Expired: 'text-gray-600',
      Cancelled: 'text-slate-600',
    };
    return colors[status] || 'text-gray-600';
  },

  /**
   * Calculate remaining time from expiry date
   */
  getRemainingSeconds: (expiresAt: string): number => {
    const expiryTime = new Date(expiresAt).getTime();
    const now = new Date().getTime();
    const diff = Math.floor((expiryTime - now) / 1000);
    
    return diff > 0 ? diff : 0;
  },

  /**
   * Format lock expiry time
   */
  formatLockExpiry: (expiresAt: string): string => {
    const date = new Date(expiresAt);
    return date.toLocaleString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  },
};

// ==========================================
// EXPORT DEFAULT
// ==========================================

export default productLockService;
