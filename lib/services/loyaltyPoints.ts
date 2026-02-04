// lib/services/loyaltyPoints.ts

import { apiClient } from '../api';
import { API_ENDPOINTS } from '../api-config';
import { customersService, Customer } from './costomers';

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
// ADMIN INTERFACES - ✅ FIXED: Extends Customer properly
// ============================================================

export interface AdminLoyaltyUser extends Customer {
  // Loyalty fields added to Customer type
  currentBalance: number;
  redemptionValue: number;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  tierLevel: 'Bronze' | 'Silver' | 'Gold';
  lastEarnedAt: string | null;
  lastRedeemedAt: string | null;
  loyaltyBalance: LoyaltyBalance | null;
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
   * ✅ ADMIN: Get all customers with their loyalty data
   * Uses customers API + fetches loyalty balance for each
   */
  getAllCustomersWithLoyalty: async (params?: {
    page?: number;
    pageSize?: number;
    searchTerm?: string;
    isActive?: boolean;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  }) => {
    try {
      // Step 1: Get all customers
      const customersResponse = await customersService.getAll({
        page: params?.page || 1,
        pageSize: params?.pageSize || 25,
        searchTerm: params?.searchTerm,
        isActive: params?.isActive,
        sortBy: params?.sortBy,
        sortDirection: params?.sortDirection || 'desc',
      });

      if (!customersResponse.data?.success || !customersResponse.data.data) {
        return {
          success: false,
          message: 'Failed to fetch customers',
          data: null,
        };
      }

      const customers = customersResponse.data.data.items;

      // Step 2: Fetch loyalty balance for each customer
      const customersWithLoyalty = await Promise.all(
        customers.map(async (customer): Promise<AdminLoyaltyUser> => {
          try {
            // Try to get loyalty balance for this customer
            const loyaltyResponse = await apiClient.get<LoyaltyBalanceApiResponse>(
              `${API_ENDPOINTS.loyaltyPoints.balance}?userId=${customer.id}`
            );

            if (loyaltyResponse.data?.success && loyaltyResponse.data.data) {
              const loyalty = loyaltyResponse.data.data;
              
              return {
                ...customer,
                currentBalance: loyalty.currentBalance,
                redemptionValue: loyalty.redemptionValue,
                totalPointsEarned: loyalty.totalPointsEarned,
                totalPointsRedeemed: loyalty.totalPointsRedeemed,
                tierLevel: loyalty.tierLevel,
                lastEarnedAt: loyalty.lastEarnedAt,
                lastRedeemedAt: loyalty.lastRedeemedAt,
                loyaltyBalance: loyalty,
              };
            }
          } catch (error) {
            // If loyalty API fails, customer has no loyalty data
            console.log(`No loyalty data for customer ${customer.id}`);
          }

          // Return customer with default loyalty values
          return {
            ...customer,
            currentBalance: 0,
            redemptionValue: 0,
            totalPointsEarned: 0,
            totalPointsRedeemed: 0,
            tierLevel: 'Bronze',
            lastEarnedAt: null,
            lastRedeemedAt: null,
            loyaltyBalance: null,
          };
        })
      );

      return {
        success: true,
        message: 'Customers with loyalty data fetched successfully',
        data: {
          items: customersWithLoyalty,
          totalCount: customersResponse.data.data.totalCount,
          currentPage: customersResponse.data.data.page,
          pageSize: customersResponse.data.data.pageSize,
          totalPages: customersResponse.data.data.totalPages,
        },
      };
    } catch (error) {
      console.error('Error fetching customers with loyalty:', error);
      throw error;
    }
  },

  /**
   * Get specific user's balance by userId
   */
  getUserBalance: async (userId: string) => {
    try {
      // Try with userId parameter
      const response = await apiClient.get<LoyaltyBalanceApiResponse>(
        `${API_ENDPOINTS.loyaltyPoints.balance}?userId=${userId}`
      );
      return response;
    } catch (error) {
      console.error(`Failed to get balance for user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Get specific user's history by userId
   */
  getUserHistory: async (userId: string, params?: LoyaltyHistoryQueryParams) => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('userId', userId);
      
      if (params?.pageNumber) queryParams.append('pageNumber', params.pageNumber.toString());
      if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
      if (params?.transactionType) queryParams.append('transactionType', params.transactionType);
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);

      const endpoint = `${API_ENDPOINTS.loyaltyPoints.history}?${queryParams.toString()}`;

      const response = await apiClient.get<LoyaltyHistoryApiResponse>(endpoint);
      return response;
    } catch (error) {
      console.error(`Failed to get history for user ${userId}:`, error);
      throw error;
    }
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
