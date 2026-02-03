// lib/services/loyaltyPoints.ts

import { apiClient } from '../api';
import { API_ENDPOINTS } from '../api-config';
import { Customer, customersService } from './costomers';

// ============================================================
// LOYALTY POINTS INTERFACES
// ============================================================

export interface LoyaltyBalance {
  id: string;
  userId: string;
  currentBalance: number;
  redemptionValue: number;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  totalPointsExpired: number;
  tierLevel: 'Bronze' | 'Silver' | 'Gold';
  pointsToNextTier: number;
  firstOrderBonusAwarded: boolean;
  totalReviewBonusEarned: number;
  totalReferralBonusEarned: number;
  lastEarnedAt: string;
  lastRedeemedAt: string | null;
}

export interface LoyaltyTransaction {
  id: string;
  userId: string;
  orderId?: string | null;
  transactionType: 'Earned' | 'Redeemed' | 'FirstOrderBonus' | 'ReviewBonus' | 'ReferralBonus' | 'Expired' | 'Adjustment';
  points: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  referenceId?: string | null;
  expiresAt?: string | null;
  isExpired: boolean;
  createdAt: string;
}

export interface LoyaltyBalanceApiResponse {
  success: boolean;
  message: string;
  data?: LoyaltyBalance;
  errors?: string[] | null;
}

export interface LoyaltyHistoryApiResponse {
  success: boolean;
  message: string;
  data?: LoyaltyTransaction[];
  errors?: string[] | null;
}

export interface LoyaltyHistoryQueryParams {
  pageNumber?: number;
  pageSize?: number;
  transactionType?: string;
  startDate?: string;
  endDate?: string;
}

// ============================================================
// ADMIN INTERFACES
// ============================================================

export interface AdminLoyaltyUser {
  userId: string;
  userEmail: string;
  userName: string;
  currentBalance: number;
  redemptionValue: number;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  tierLevel: 'Bronze' | 'Silver' | 'Gold';
  lastEarnedAt: string | null;
  lastRedeemedAt: string | null;
  customerDetails?: Customer | null;
}

export interface AdminLoyaltyUsersApiResponse {
  success: boolean;
  message: string;
  data?: {
    items: AdminLoyaltyUser[];
    totalCount: number;
    currentPage: number;
    pageSize: number;
  };
  errors?: string[] | null;
}

export interface AdminLoyaltyQueryParams {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  tierLevel?: string;
  sortBy?: 'balance' | 'earned' | 'redeemed' | 'lastActivity';
  sortDirection?: 'asc' | 'desc';
}

// ============================================================
// LOYALTY POINTS SERVICE
// ============================================================

export const loyaltyPointsService = {
  /**
   * Get current user's loyalty balance
   * GET /api/loyalty/balance
   */
  getBalance: (config: any = {}) =>
    apiClient.get<LoyaltyBalanceApiResponse>(API_ENDPOINTS.loyaltyPoints.balance, config),

  /**
   * Get current user's loyalty transaction history
   * GET /api/loyalty/history
   */
  getHistory: (params?: LoyaltyHistoryQueryParams, config: any = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params?.pageNumber) queryParams.append('pageNumber', params.pageNumber.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params?.transactionType) queryParams.append('transactionType', params.transactionType);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const endpoint = queryParams.toString()
      ? `${API_ENDPOINTS.loyaltyPoints.history}?${queryParams.toString()}`
      : API_ENDPOINTS.loyaltyPoints.history;

    return apiClient.get<LoyaltyHistoryApiResponse>(endpoint, config);
  },

  /**
   * ADMIN: Get all users' loyalty balances (raw data without customer details)
   * GET /api/admin/loyalty/users
   */
  getAllUsers: (params?: AdminLoyaltyQueryParams, config: any = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params?.pageNumber) queryParams.append('pageNumber', params.pageNumber.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params?.searchTerm) queryParams.append('searchTerm', params.searchTerm);
    if (params?.tierLevel) queryParams.append('tierLevel', params.tierLevel);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortDirection) queryParams.append('sortDirection', params.sortDirection);

    const endpoint = queryParams.toString()
      ? `${API_ENDPOINTS.loyaltyPoints.adminUsers}?${queryParams.toString()}`
      : API_ENDPOINTS.loyaltyPoints.adminUsers;

    return apiClient.get<AdminLoyaltyUsersApiResponse>(endpoint, config);
  },

  /**
   * ✅ BEST METHOD: Get all users with customer details (OPTIMIZED BATCH FETCH)
   * Fetches loyalty data + enriches with customer details in 2 API calls
   */
  getAllUsersWithDetails: async (params?: AdminLoyaltyQueryParams) => {
    try {
      // Step 1: Fetch loyalty data
      const loyaltyResponse = await loyaltyPointsService.getAllUsers(params);

      if (!loyaltyResponse.data?.success || !loyaltyResponse.data.data) {
        return loyaltyResponse;
      }

      const loyaltyUsers = loyaltyResponse.data.data.items;

      // If no users, return early
      if (loyaltyUsers.length === 0) {
        return loyaltyResponse;
      }

      // Step 2: Fetch ALL customers in one call (batch fetch)
      const customersResponse = await customersService.getAll({
        page: 1,
        pageSize: 1000, // Adjust based on your customer count
        sortDirection: 'desc',
      });

      const customers = customersResponse.data?.data?.items || [];

      // Step 3: Create customer lookup map for O(1) access
      const customerMap = new Map<string, Customer>(
        customers.map(customer => [customer.id, customer])
      );

      // Step 4: Enrich loyalty users with customer details
      const enrichedUsers = loyaltyUsers.map(loyaltyUser => {
        const customer = customerMap.get(loyaltyUser.userId);

        if (customer) {
          return {
            ...loyaltyUser,
            userName: customer.fullName || `${customer.firstName} ${customer.lastName}`.trim(),
            userEmail: customer.email || 'N/A',
            customerDetails: customer,
          };
        }

        // Fallback for users not found in customer list
        return {
          ...loyaltyUser,
          userName: loyaltyUser.userName || 'Unknown User',
          userEmail: loyaltyUser.userEmail || 'N/A',
          customerDetails: null,
        };
      });

      // Step 5: Return enriched data
      return {
        ...loyaltyResponse,
        data: {
          ...loyaltyResponse.data,
          data: {
            ...loyaltyResponse.data.data,
            items: enrichedUsers,
          },
        },
      };
    } catch (error) {
      console.error('Error fetching users with details:', error);
      throw error;
    }
  },

  /**
   * ADMIN: Get specific user's balance
   * GET /api/admin/loyalty/user/{userId}/balance
   */
  getUserBalance: (userId: string, config: any = {}) =>
    apiClient.get<LoyaltyBalanceApiResponse>(
      `${API_ENDPOINTS.loyaltyPoints.adminUserBalance}/${userId}/balance`,
      config
    ),

  /**
   * ADMIN: Get specific user's history
   * GET /api/admin/loyalty/user/{userId}/history
   */
  getUserHistory: (userId: string, params?: LoyaltyHistoryQueryParams, config: any = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params?.pageNumber) queryParams.append('pageNumber', params.pageNumber.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params?.transactionType) queryParams.append('transactionType', params.transactionType);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const endpoint = queryParams.toString()
      ? `${API_ENDPOINTS.loyaltyPoints.adminUserHistory}/${userId}/history?${queryParams.toString()}`
      : `${API_ENDPOINTS.loyaltyPoints.adminUserHistory}/${userId}/history`;

    return apiClient.get<LoyaltyHistoryApiResponse>(endpoint, config);
  },
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Format points with commas
 */
export const formatPoints = (points: number): string => {
  return points.toLocaleString('en-GB');
};

/**
 * Get tier color
 */
export const getTierColor = (tier: string): {
  bg: string;
  text: string;
  border: string;
  icon: string;
} => {
  switch (tier.toLowerCase()) {
    case 'gold':
      return {
        bg: 'bg-yellow-500/10',
        text: 'text-yellow-400',
        border: 'border-yellow-500/30',
        icon: 'text-yellow-400',
      };
    case 'silver':
      return {
        bg: 'bg-slate-400/10',
        text: 'text-slate-300',
        border: 'border-slate-400/30',
        icon: 'text-slate-300',
      };
    case 'bronze':
    default:
      return {
        bg: 'bg-orange-600/10',
        text: 'text-orange-400',
        border: 'border-orange-600/30',
        icon: 'text-orange-400',
      };
  }
};

/**
 * Get transaction type color and label
 */
export const getTransactionTypeInfo = (type: string): {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
} => {
  switch (type) {
    case 'Earned':
      return {
        label: 'Earned',
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
      };
    case 'Redeemed':
      return {
        label: 'Redeemed',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
      };
    case 'FirstOrderBonus':
      return {
        label: 'First Order Bonus',
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/10',
        borderColor: 'border-cyan-500/30',
      };
    case 'ReviewBonus':
      return {
        label: 'Review Bonus',
        color: 'text-violet-400',
        bgColor: 'bg-violet-500/10',
        borderColor: 'border-violet-500/30',
      };
    case 'ReferralBonus':
      return {
        label: 'Referral Bonus',
        color: 'text-pink-400',
        bgColor: 'bg-pink-500/10',
        borderColor: 'border-pink-500/30',
      };
    case 'Expired':
      return {
        label: 'Expired',
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
      };
    case 'Adjustment':
      return {
        label: 'Adjustment',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/30',
      };
    default:
      return {
        label: type,
        color: 'text-slate-400',
        bgColor: 'bg-slate-500/10',
        borderColor: 'border-slate-500/30',
      };
  }
};

/**
 * Format relative date
 */
export const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }
  
  const years = Math.floor(diffDays / 365);
  return years === 1 ? '1 year ago' : `${years} years ago`;
};

/**
 * Format expiry date with warning
 */
export const formatExpiryDate = (expiresAt: string | null | undefined): {
  text: string;
  isExpiringSoon: boolean;
  color: string;
} => {
  if (!expiresAt) {
    return {
      text: 'Never expires',
      isExpiringSoon: false,
      color: 'text-slate-500',
    };
  }

  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      text: 'Expired',
      isExpiringSoon: false,
      color: 'text-red-400',
    };
  }

  if (diffDays <= 30) {
    return {
      text: `Expires in ${diffDays} day${diffDays !== 1 ? 's' : ''}`,
      isExpiringSoon: true,
      color: 'text-orange-400',
    };
  }

  const formattedDate = expiryDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return {
    text: `Expires ${formattedDate}`,
    isExpiringSoon: false,
    color: 'text-slate-400',
  };
};

/**
 * Calculate redemption value in pounds
 */
export const calculateRedemptionValueInPounds = (
  points: number,
  redemptionRate: number = 100
): number => {
  return points / redemptionRate;
};

/**
 * Check if transaction is a gain (positive points)
 */
export const isGainTransaction = (transaction: LoyaltyTransaction): boolean => {
  return transaction.points > 0;
};

/**
 * Check if transaction is a loss (negative points)
 */
export const isLossTransaction = (transaction: LoyaltyTransaction): boolean => {
  return transaction.points < 0;
};

/**
 * Format date to readable string
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
