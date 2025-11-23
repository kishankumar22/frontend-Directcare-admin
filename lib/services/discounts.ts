import { apiClient } from '../api';
import { API_ENDPOINTS } from '../api-config';

// --- Discount Type & Limitation Types ---
export type DiscountType =
  | "AssignedToOrderTotal"
  | "AssignedToProducts"
  | "AssignedToCategories"
  | "AssignedToManufacturers"
  | "AssignedToShipping";

export type DiscountLimitationType =
  | "Unlimited"
  | "NTimesOnly"
  | "NTimesPerCustomer";

// --- Discount Interface ---
export interface Discount {
  id: string;
  name: string;
  isActive: boolean;
  discountType: DiscountType;
  usePercentage: boolean;
  discountAmount: number;
  discountPercentage: number;
  maximumDiscountAmount: number | null;
  startDate: string;
  endDate: string;
  requiresCouponCode: boolean;
  couponCode: string | null;
  isCumulative: boolean;
  discountLimitation: DiscountLimitationType;
  limitationTimes: number | null;
  maximumDiscountedQuantity: number | null;
  appliedToSubOrders: boolean;
  adminComment: string;
  assignedProductIds: string;
  assignedCategoryIds: string;
  assignedManufacturerIds: string;
  createdAt?: string;
  updatedAt?: string | null;
  createdBy?: string;
  updatedBy?: string | null;
}

// --- Create/Update DTO ---
export interface CreateDiscountDto {
  name: string;
  isActive: boolean;
  discountType: DiscountType;
  usePercentage: boolean;
  discountAmount: number;
  discountPercentage: number;
  maximumDiscountAmount: number | null;
  startDate: string;
  endDate: string;
  requiresCouponCode: boolean;
  couponCode: string;
  isCumulative: boolean;
  discountLimitation: DiscountLimitationType;
  limitationTimes: number | null;
  maximumDiscountedQuantity: number | null;
  appliedToSubOrders: boolean;
  adminComment: string;
  assignedProductIds: string;
  assignedCategoryIds: string;
  assignedManufacturerIds: string;
}

// --- API Response ---
export interface DiscountApiResponse {
  success: boolean;
  message?: string;
  data: Discount[];
}

// --- Stats Interface ---
export interface DiscountStats {
  totalDiscounts: number;
  activeDiscounts: number;
  productDiscounts: number;
  expiringSoon: number;
}

// --- Main Service ---
export const discountsService = {
  // Get all discounts (optional includeInactive param)
  getAll: (config: any = {}) =>
    apiClient.get<DiscountApiResponse>(API_ENDPOINTS.discounts, config),

  // Get discount by ID
  getById: (id: string, config: any = {}) =>
    apiClient.get<Discount>(`${API_ENDPOINTS.discounts}/${id}`, config),

  // Create new discount
  create: (data: CreateDiscountDto, config: any = {}) =>
    apiClient.post<Discount>(API_ENDPOINTS.discounts, data, config),

  // Update discount by ID
  update: (id: string, data: Partial<CreateDiscountDto>, config: any = {}) =>
    apiClient.put<Discount>(`${API_ENDPOINTS.discounts}/${id}`, data, config),

  // Delete discount by ID
  
  // Delete discount by ID (no extra config/params needed)
  delete: (id: string) =>
    apiClient.delete<void>(`${API_ENDPOINTS.discounts}/${id}`),
};
