import { apiClient } from '../api';
import { API_ENDPOINTS } from '../api-config';

// --- ProductReview Interfaces ---
export interface ReviewReply {
  id: string;
  reviewId: string;
  comment: string;
  isAdminReply: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProductReview {
  id: string;
  productId: string;
  customerId: string;
  customerName: string;
  customerEmail?: string; // ✅ Add this
  title: string;
  comment: string;
  rating: number;
  isApproved: boolean;
  isVerifiedPurchase: boolean;
  approvedBy?: string;
  approvedAt?: string;
  helpfulCount: number;
  notHelpfulCount: number;
  createdAt: string;
  updatedAt?: string;
  replies: ReviewReply[];
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: string[] | null;
}

export interface CreateReviewDto {
  productId: string;
  title: string;
  comment: string;
  rating: number;
  customerEmail?: string; // ✅ Add this
  customerName?: string;  // ✅ Add this
}

export interface UpdateReviewDto {
  title: string;
  comment: string;
  rating: number;
}

export interface ReplyReviewDto {
  reviewId: string;
  comment: string;
  isAdminReply: boolean;
}

export interface ProductReviewStats {
  total: number;
  pending: number;
  approved: number;
  averageRating: number;
}

export interface PaginatedProductsResponse {
  items: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    price?: number;
  }[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

// --- Main Service ---
export const productReviewsService = {
  // ✅ Get reviews by product ID (Admin + Filters)
  getByProductId: (
    productId: string, 
    includeUnapproved: boolean = true,
    minRating?: number,
    maxRating?: number,
    verifiedPurchaseOnly?: boolean,
    config: any = {}
  ) => {
    const params = new URLSearchParams();
    if (includeUnapproved !== undefined) params.append('includeUnapproved', String(includeUnapproved));
    if (minRating !== undefined) params.append('minRating', String(minRating));
    if (maxRating !== undefined) params.append('maxRating', String(maxRating));
    if (verifiedPurchaseOnly !== undefined) params.append('verifiedPurchaseOnly', String(verifiedPurchaseOnly));
    
    const queryString = params.toString();
    return apiClient.get<ApiResponse<ProductReview[]>>(
      `${API_ENDPOINTS.productReviews}/product/${productId}${queryString ? '?' + queryString : ''}`,
      config
    );
  },

  // ✅ Get pending reviews (Admin only)
  getPendingReviews: (pageNumber: number = 1, pageSize: number = 25, config: any = {}) =>
    apiClient.get<ApiResponse<ProductReview[]>>(
      `${API_ENDPOINTS.productReviews}/pending?pageNumber=${pageNumber}&pageSize=${pageSize}`,
      config
    ),

  // ✅ Create review (Customer - not used in admin)
  create: (data: CreateReviewDto, config: any = {}) =>
    apiClient.post<ApiResponse<ProductReview>>(
      API_ENDPOINTS.productReviews,
      data,
      config
    ),

  // ✅ Update review
  update: (reviewId: string, data: UpdateReviewDto, config: any = {}) =>
    apiClient.put<ApiResponse<ProductReview>>(
      `${API_ENDPOINTS.productReviews}/${reviewId}`,
      data,
      config
    ),

  // ✅ Delete review
  delete: (reviewId: string, config: any = {}) =>
    apiClient.delete<ApiResponse<null>>(
      `${API_ENDPOINTS.productReviews}/${reviewId}`,
      config
    ),

  // ✅ Get review by Product ID and Customer Email (for checking duplicates during import)
// lib/services/productReviews.ts

getByProductAndCustomer: async (
  productId: string, 
  customerEmail: string
): Promise<ProductReview | null> => {
  try {
    const response = await apiClient.get<ApiResponse<ProductReview[]>>(
      `${API_ENDPOINTS.productReviews}/product/${productId}?includeUnapproved=true`
    );
    
    if (response.data && 'success' in response.data && response.data.success) {
      const reviews = response.data.data;
      if (Array.isArray(reviews)) {
        // ✅ Fix: Check customerName instead of customerEmail
        const matchingReview = reviews.find((r: ProductReview) => {
          const reviewEmail = r.customerEmail || r.customerName; // ← customerName contains email
          return reviewEmail?.toLowerCase() === customerEmail.toLowerCase();
        });
        
        console.log(`🔍 Checking product ${productId} for ${customerEmail}:`, matchingReview ? 'FOUND' : 'NOT FOUND');
        return matchingReview || null;
      }
    }
    return null;
  } catch (error) {
    console.error('Error fetching review by product and customer:', error);
    return null;
  }
},


  // ✅ Approve review (Admin only)
  approve: (reviewId: string, config: any = {}) =>
    apiClient.put<ApiResponse<ProductReview>>(
      `${API_ENDPOINTS.productReviews}/${reviewId}/approve`,
      {},
      config
    ),

  // ✅ Reply to review (Admin)
  reply: (reviewId: string, data: ReplyReviewDto, config: any = {}) =>
    apiClient.post<ApiResponse<ReviewReply>>(
      `${API_ENDPOINTS.productReviews}/${reviewId}/reply`,
      data,
      config
    ),

  // ✅ Mark as helpful (not used in admin)
  markHelpful: (reviewId: string, isHelpful: boolean, config: any = {}) =>
    apiClient.post<ApiResponse<boolean>>(
      `${API_ENDPOINTS.productReviews}/${reviewId}/helpful?isHelpful=${isHelpful}`,
      {},
      config
    ),

  // ✅ Get all products (for filter dropdown)
  getAllProducts: (page: number = 1, pageSize: number = 1000, config: any = {}) =>
    apiClient.get<ApiResponse<PaginatedProductsResponse>>(
      `/api/Products?page=${page}&pageSize=${pageSize}&sortDirection=asc`,
      config
    ),
};
