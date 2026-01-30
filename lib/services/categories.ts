// lib/services/categoriesService.ts

import { apiClient } from '../api';
import { API_ENDPOINTS } from '../api-config';
// ---- Shared Types ----
export interface Category {
  id: string;
  name: string;
  description: string;
  slug: string;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
  productCount: number;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  parentCategoryId?: string;
  parentCategoryName?:string;
  showOnHomepage: boolean; 
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  subCategories?: Category[];
}
export interface CreateCategoryDto {
  name: string;
  description: string;
}
export interface CategoryApiResponse {
  success: boolean;
  message?: string;
  data: Category[];
}

export interface CategoryStats {
  totalCategories: number;
  totalProducts: number;
  activeCategories: number;
  homepageCategories: number;  // ✅ Add this
}

export interface CreateCategoryDto { name: string; description: string; }
export interface CategoryApiResponse { success: boolean; message?: string; data: Category[]; }

export const categoriesService = {
  // Get all categories (optionally allow config for params, headers)
getAll: (config: any = {}) =>
    apiClient.get<CategoryApiResponse>(
      `${API_ENDPOINTS.categories}?includeInactive=true&includeSubCategories=true`,
      config
    ),
  // Get category by ID
  getById: (id: string, config: any = {}) =>
    apiClient.get<Category>(`${API_ENDPOINTS.categories}/${id}`, config),

  // Create
  create: (data: CreateCategoryDto, config: any = {}) =>
    apiClient.post<Category>(API_ENDPOINTS.categories, data, config),

  // Update
  update: (id: string, data: Partial<CreateCategoryDto>, config: any = {}) =>
    apiClient.put<Category>(`${API_ENDPOINTS.categories}/${id}`, data, config),

  // Delete
  delete: (id: string, config: any = {}) =>
    apiClient.delete<void>(`${API_ENDPOINTS.categories}/${id}`, config),

  // ---- Image Upload ----
uploadImage: async (file: File, params?: Record<string, any>) => {
  const formData = new FormData();
  formData.append("image", file);
  const searchParams = params ? "?" + new URLSearchParams(params).toString() : "";
  return apiClient.post<{ success: boolean; message: string; data: string }>(
    API_ENDPOINTS.uploadCategoryImage + searchParams,
    formData
  );
},

  // Make sure deleteBlogCategoryImage endpoint exists and is correct for categories
 deleteImage: (imageUrl: string) =>
  apiClient.delete<void>(API_ENDPOINTS.deleteBlogCategoryImage, { params: { imageUrl } }),

};
