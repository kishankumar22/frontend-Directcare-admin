import { apiClient } from '../api';
import { API_ENDPOINTS } from '../api-config';

// --- Brand TypeScript Interfaces ---
export interface Brand {
  id: string;
  name: string;
  description: string;
  slug: string;
  logoUrl?: string;
  isPublished: boolean;
  isDeleted: boolean; 
  showOnHomepage: boolean;
  displayOrder: number;
  productCount: number;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateBrandDto {
  name: string;
  description: string;
}

 export interface BrandApiResponse {
  success: boolean;
  message?: string;
  data: Brand[];
}

export interface BrandStats {
  totalBrands: number;
  publishedBrands: number;
  homepageBrands: number;
  totalProducts: number;
}

// --- Main Brand Service ---
export const brandsService = {
  // Get all brands (with optional config: params/headers)
  getAll: (config: any = {}) =>
    apiClient.get<BrandApiResponse>(API_ENDPOINTS.brands, config),

  // Get single brand by ID
  getById: (id: string, config: any = {}) =>
    apiClient.get<Brand>(`${API_ENDPOINTS.brands}/${id}`, config),

  // Create new brand
  create: (data: CreateBrandDto, config: any = {}) =>
    apiClient.post<Brand>(API_ENDPOINTS.brands, data, config),

  // Update brand by ID
  update: (id: string, data: Partial<CreateBrandDto>, config: any = {}) =>
    apiClient.put<Brand>(`${API_ENDPOINTS.brands}/${id}`, data, config),

  // Delete brand by ID
  delete: (id: string, config: any = {}) =>
    apiClient.delete<void>(`${API_ENDPOINTS.brands}/${id}`, config),

restore: (id: string) =>
  apiClient.post<void>(`${API_ENDPOINTS.brands}/${id}/restore`),
  // ---- Logo Upload (Brand) ----
uploadLogo: async (file: File, params?: Record<string, any>) => {
  const formData = new FormData();
  formData.append("logo", file); // ✅ Backend expects 'logo', NOT 'image'
  const searchParams = params ? "?" + new URLSearchParams(params).toString() : "";
  return apiClient.post<{ success: boolean; message: string; data: string }>(
    API_ENDPOINTS.uploadBrandLogo + searchParams,
    formData
  );
},

  // ---- Logo Delete (Brand) ----
  deleteLogo: (logoUrl: string) =>
    apiClient.delete<void>(API_ENDPOINTS.deleteBrandLogo, { params: { imageUrl: logoUrl } }),
};
