import { apiClient } from '../api';
import { API_ENDPOINTS } from '../api-config';

// --- BlogPost Interface (Clean - NO success/data fields) ---
export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  content?: string;
  body?: string;
  bodyOverview?: string;
  thumbnailImageUrl?: string;
  featuredImageUrl?: string;
  imageUrls?: string[];
  videoUrl?: string | null;
  
  isPublished: boolean;
  isDeleted?: boolean; // ✅ ADD THIS
  publishedAt?: string;
  startDate?: string;
  endDate?: string;
  
  viewCount: number;
  allowComments?: boolean;
  displayOrder?: number;
  showOnHomePage?: boolean;
  includeInSitemap?: boolean;
  limitedToStores?: boolean;
  
  blogCategoryId?: string | null;
  blogCategoryName?: string;
  
  authorId?: string | null;
  authorName?: string;
  
  tags?: string[];
  labels?: any[];
  
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  searchEngineFriendlyPageName?: string;
  
  storeIds?: string[];
  relatedBlogPostIds?: string[];
  customerRoles?: string | null;
  languageId?: string;
  
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

// --- BlogCategory Interface (Clean) ---
export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
  displayOrder?: number;
}

// --- Generic ApiResponse ---
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: string[] | null;
}

// --- Stats Interface ---
export interface BlogPostStats {
  totalPosts: number;
  published: number;
  drafts: number;
  featured: number;
}

// --- Main Service ---
export const blogPostsService = {
  // Get all blog posts
  getAll: (
    includeUnpublished: boolean = true,
    onlyHomePage: boolean = false,
    config: any = {}
  ) =>
    apiClient.get<ApiResponse<BlogPost[]>>(
      `${API_ENDPOINTS.blogPosts}`,
      config
    ),

  // ✅ FIXED: Get blog post by ID returns ApiResponse<BlogPost>
  getById: (id: string, config: any = {}) =>
    apiClient.get<ApiResponse<BlogPost>>(`${API_ENDPOINTS.blogPosts}/${id}`, config),

  // Get blog post by slug
  getBySlug: (slug: string, config: any = {}) =>
    apiClient.get<ApiResponse<BlogPost>>(`${API_ENDPOINTS.blogPosts}/slug/${slug}`, config),

  // Create new blog post
  create: (data: Partial<BlogPost>, config: any = {}) =>
    apiClient.post<ApiResponse<BlogPost>>(API_ENDPOINTS.blogPosts, data, config),

  // Update blog post by ID
  update: (id: string, data: Partial<BlogPost>, config: any = {}) =>
    apiClient.put<ApiResponse<BlogPost>>(`${API_ENDPOINTS.blogPosts}/${id}`, data, config),

  // Delete blog post by ID
  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`${API_ENDPOINTS.blogPosts}/${id}`),

  // Upload blog post image
  uploadImage: async (file: File, params?: Record<string, any>) => {
    const formData = new FormData();
    formData.append("image", file);
    const searchParams = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiClient.post<{ success: boolean; message: string; data: string; errors: string[] | null }>(
      API_ENDPOINTS.uploadBlogPostImage + searchParams,
      formData
    );
  },

  // Delete blog post image
  deleteImage: (imageUrl: string) =>
    apiClient.delete<ApiResponse<null>>(API_ENDPOINTS.deleteBlogPostImage, { params: { imageUrl } }),

  // Get all blog categories
  getAllCategories: (config: any = {}) =>
    apiClient.get<ApiResponse<BlogCategory[]>>('/api/BlogCategories', config),
};
