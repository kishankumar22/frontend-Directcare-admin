import { apiClient } from '../api';
import { API_ENDPOINTS } from '../api-config';

// --- BlogCategory Interface ---
export interface BlogCategory {
  id: string;
  name: string;
  description: string;
  slug: string;
  imageUrl?: string;
  isActive: boolean;
  displayOrder: number;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  searchEngineFriendlyPageName?: string;
  parentCategoryId?: string | null;

  subCategories?: string[];
  blogPostCount: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateBlogCategoryDto {
  name: string;
  description: string;
  slug: string;
  imageUrl?: string;
  isActive: boolean;
  displayOrder: number;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  searchEngineFriendlyPageName?: string;
  parentCategoryId?: string | null;
}

// --- Generic ApiResponse ---
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: string[] | null;
}

export interface BlogCategoryApiResponse {
  success: boolean;
  message: string;
  data: BlogCategory[];
  errors: string[] | null;
}

// --- Main Service ---
export const blogCategoriesService = {
  // Get all blog categories
  getAll: (config: any = {}) =>
    apiClient.get<BlogCategoryApiResponse>(API_ENDPOINTS.blogCategories, config),

  // Get blog category by ID
  getById: (id: string, config: any = {}) =>
    apiClient.get<BlogCategory>(`${API_ENDPOINTS.blogCategories}/${id}`, config),

  // ✅ FIXED: Create returns ApiResponse<BlogCategory>
  create: (data: CreateBlogCategoryDto, config: any = {}) =>
    apiClient.post<ApiResponse<BlogCategory>>(API_ENDPOINTS.blogCategories, data, config),

  // ✅ FIXED: Update returns ApiResponse<BlogCategory>
  update: (id: string, data: Partial<CreateBlogCategoryDto>, config: any = {}) =>
    apiClient.put<ApiResponse<BlogCategory>>(`${API_ENDPOINTS.blogCategories}/${id}`, data, config),

  // Delete blog category by ID
  delete: (id: string) =>
    apiClient.delete<void>(`${API_ENDPOINTS.blogCategories}/${id}`),

  // Upload blog category image
  uploadImage: async (file: File, params?: Record<string, any>) => {
    const formData = new FormData();
    formData.append("image", file);
    const searchParams = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiClient.post<{ success: boolean; message: string; data: string; errors: string[] | null }>(
      API_ENDPOINTS.uploadBlogCategoryImage + searchParams,
      formData
    );
  },

  // Delete blog category image
  deleteImage: (imageUrl: string) =>
    apiClient.delete<void>(API_ENDPOINTS.deleteBlogCategoryImage, { params: { imageUrl } }),
};
