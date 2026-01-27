// lib/services/products.service.ts
import { apiClient } from '../api';
import { API_ENDPOINTS } from '../api-config';

// ==========================================
// INTERFACES - PRODUCT DATA
// ==========================================

export interface ProductImage {
  id: string;
  imageUrl: string;
  altText: string;
  sortOrder: number;
  isMain: boolean;
  fileName?: string;
  fileSize?: number;
  file?: File;
}

export interface ProductAttribute {
  id: string;
  name: string;
  value: string;
  displayOrder: number;
  sortOrder?: number;
  displayName?: string;
}

export interface VATRateData {
  id: string;
  name: string;
  rate: number;
  isActive?: boolean;
  displayOrder?: number;
  description?: string;
  country?: string;
  region?: string
  isDefault?: boolean;
}

 // Find this interface in your code and update it:

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number | null;
  compareAtPrice: number | null;
  weight: number | null;
  stockQuantity: number;
  trackInventory: boolean;
  option1Name: string | null;
  option1Value: string | null;
  option2Name: string | null;
  option2Value: string | null;
  option3Name: string | null;
  option3Value: string | null;
  imageUrl: string | null;
  imageFile?: File; // For upload preview
  isDefault: boolean;
  displayOrder: number;
  isActive: boolean;
  gtin: string | null;
  barcode: string | null; // ✅ ADD THIS LINE
}

export interface ProductsApiResponse {
  success: boolean;
  message: string;
  data: {
    items: ProductItem[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasPrevious: boolean;
    hasNext: boolean;
  };
  errors: null;
}

interface CategoryApiResponse {
  success: boolean;
  message: string;
  data: CategoryData[];
  errors: null;
}

export interface RelatedProduct {
  id: string;
  name: string;
  price: number;
  image?: string;
  sku: string;
}

export interface DropdownsData {
  brands: BrandData[];
  categories: CategoryData[];
  vatRates: VATRateData[];
}

export interface ProductItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  oldPrice?: number;
  description?: string;
  shortDescription?: string;
}

export interface CategoryData {
  id: string;
  name: string;
  description?: string;
  slug?: string;
  imageUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
  parentCategoryId?: string | null;
  parentCategoryName?: string | null;
  subCategories?: CategoryData[];
}

export interface Product {
  id: string;
  name: string;
  slug?: string;
  sku: string;
  gtin?: string;
  manufacturerPartNumber?: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  categoryName: string;
  brandId?: string;
  brandName: string;
  productType: string;
  price: number;
  oldPrice?: number;
  compareAtPrice?: number;
  costPrice?: number;
  callForPrice?: boolean;
  customerEntersPrice?: boolean;
  minimumCustomerEnteredPrice?: number;
  maximumCustomerEnteredPrice?: number;
  stockQuantity: number;
  trackQuantity?: boolean;
  manageInventoryMethod?: string;
  minStockQuantity?: number;
  notifyAdminForQuantityBelow?: boolean;
  notifyQuantityBelow?: number;
  allowBackorder?: boolean;
  backorderMode?: string;
  orderMinimumQuantity?: number;
  orderMaximumQuantity?: number;
  allowedQuantities?: string;
  notReturnable?: boolean;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  weightUnit?: string;
  dimensionUnit?: string;
  requiresShipping?: boolean;
  isFreeShipping?: boolean;
  shipSeparately?: boolean;
  additionalShippingCharge?: number;
  isPublished: boolean;
  publishedAt?: string;
  visibleIndividually?: boolean;
  showOnHomepage?: boolean;
  displayOrder?: number;
  disableBuyButton?: boolean;
  disableWishlistButton?: boolean;
  markAsNew?: boolean;
  markAsNewStartDate?: string;
  markAsNewEndDate?: string;
  availableStartDate?: string;
  availableEndDate?: string;
  taxExempt?: boolean;
  taxCategoryId?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  searchEngineFriendlyPageName?: string;
  tags?: string;
  averageRating?: number;
  reviewCount?: number;
  viewCount?: number;
  allowCustomerReviews?: boolean;
  videoUrls?: string;
  specificationAttributes?: string;
  relatedProductIds?: string;
  crossSellProductIds?: string;
  adminComment?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  images?: ProductImage[];
  attributes?: ProductAttribute[];
  variants?: ProductVariant[];
  relatedProducts?: RelatedProduct[];
  crossSellProducts?: RelatedProduct[];
}

export interface BrandData {
  id: string;
  name: string;
  description?: string;
  slug?: string;
  logoUrl?: string;
  isPublished?: boolean;
  showOnHomepage?: boolean;
  displayOrder?: number;
}

export interface SimpleProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  stockQuantity: number;
}

export interface CreateProductDto {
  name: string;
  slug?: string;
  sku: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  brandId?: string;
  productType?: string;
  price: number;
  stockQuantity: number;
  isPublished?: boolean;
  gtin?: string;
  manufacturerPartNumber?: string;
  oldPrice?: number;
  compareAtPrice?: number;
  costPrice?: number;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  weightUnit?: string;
  dimensionUnit?: string;
  requiresShipping?: boolean;
  isFreeShipping?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  tags?: string;
  allowCustomerReviews?: boolean;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {}

export interface ProductQueryParams {
  page?: number;
  pageSize?: number;
  categoryId?: string;
  brandId?: string;
  search?: string;
  isPublished?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  productType?: 'simple' | 'grouped' | 'bundle';
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  message?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// ==========================================
// PRODUCTS SERVICE
// ==========================================

export const productsService = {
  
  // ==========================================
  // BASIC CRUD OPERATIONS
  // ==========================================

  getAll: async (params?: ProductQueryParams) => {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params?.categoryId) queryParams.append('categoryId', params.categoryId);
    if (params?.brandId) queryParams.append('brandId', params.brandId);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.isPublished !== undefined) queryParams.append('isPublished', params.isPublished.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const url = `${API_ENDPOINTS.products}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    return apiClient.get<PaginatedResponse<Product>>(url);
  },

  getById: async (id: string) => {
    return apiClient.get<ApiResponse<Product>>(`${API_ENDPOINTS.products}/${id}`);
  },

  create: async (data: CreateProductDto) => {
    return apiClient.post<ApiResponse<Product>>(API_ENDPOINTS.products, data);
  },

  update: async (id: string, data: UpdateProductDto) => {
    return apiClient.put<ApiResponse<Product>>(`${API_ENDPOINTS.products}/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete<ApiResponse<void>>(`${API_ENDPOINTS.products}/${id}`);
  },

  getByCategory: async (categoryId: string, params?: Omit<ProductQueryParams, 'categoryId'>) => {
    return productsService.getAll({ ...params, categoryId });
  },

  getByBrand: async (brandId: string, params?: Omit<ProductQueryParams, 'brandId'>) => {
    return productsService.getAll({ ...params, brandId });
  },

  // ==========================================
  // IMAGE MANAGEMENT
  // ==========================================

  addImages: async (productId: string, images: FormData) => {
    return apiClient.post<ApiResponse<ProductImage[]>>(
      `${API_ENDPOINTS.products}/${productId}/images`,
      images,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  },

  deleteImage: async (imageId: string) => {
    return apiClient.delete<ApiResponse<void>>(
      `${API_ENDPOINTS.products}/images/${imageId}`
    );
  },

  createWithImages: async (data: FormData) => {
    return apiClient.post<ApiResponse<Product>>(
      `${API_ENDPOINTS.products}/with-images`,
      data,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  },

  // ==========================================
  // 🗑️ ATTRIBUTE MANAGEMENT
  // ==========================================

  deleteAttribute: async (productId: string, attributeId: string) => {
    return apiClient.delete<ApiResponse<void>>(
      `${API_ENDPOINTS.products}/${productId}/attributes/${attributeId}`
    );
  },

  addAttribute: async (productId: string, attribute: ProductAttribute) => {
    return apiClient.post<ApiResponse<ProductAttribute>>(
      `${API_ENDPOINTS.products}/${productId}/attributes`,
      attribute
    );
  },

  updateAttribute: async (productId: string, attributeId: string, attribute: Partial<ProductAttribute>) => {
    return apiClient.put<ApiResponse<ProductAttribute>>(
      `${API_ENDPOINTS.products}/${productId}/attributes/${attributeId}`,
      attribute
    );
  },

  // ==========================================
  // 🗑️ VARIANT MANAGEMENT
  // ==========================================

  deleteVariant: async (productId: string, variantId: string) => {
    return apiClient.delete<ApiResponse<void>>(
      `${API_ENDPOINTS.products}/${productId}/variants/${variantId}`
    );
  },

  addVariant: async (productId: string, variant: ProductVariant) => {
    return apiClient.post<ApiResponse<ProductVariant>>(
      `${API_ENDPOINTS.products}/${productId}/variants`,
      variant
    );
  },

  updateVariant: async (productId: string, variantId: string, variant: Partial<ProductVariant>) => {
    return apiClient.put<ApiResponse<ProductVariant>>(
      `${API_ENDPOINTS.products}/${productId}/variants/${variantId}`,
      variant
    );
  },

  addVariantImage: async (variantId: string, image: FormData) => {
    return apiClient.post<ApiResponse<ProductVariant>>(
      `${API_ENDPOINTS.products}/variants/${variantId}/image`,
      image,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  },

  createWithVariants: async (data: FormData) => {
    return apiClient.post<ApiResponse<Product>>(
      `${API_ENDPOINTS.products}/with-variants`,
      data,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  },

  // ==========================================
  // 📊 ADMIN COMMENT HISTORY
  // ==========================================

  getAdminCommentHistory: async (productId: string) => {
    return apiClient.get<ApiResponse<any[]>>(
      `${API_ENDPOINTS.products}/${productId}/admin-comment-history`
    );
  },

  // ==========================================
  // 📧 BACK-IN-STOCK SUBSCRIPTIONS
  // ==========================================

  subscribeBackInStock: async (productId: string, email: string) => {
    return apiClient.post<ApiResponse<any>>(
      `${API_ENDPOINTS.products}/${productId}/back-in-stock-subscription`,
      { email }
    );
  },

  getBackInStockSubscribers: async (productId: string) => {
    return apiClient.get<ApiResponse<any[]>>(
      `${API_ENDPOINTS.products}/${productId}/back-in-stock-subscribers`
    );
  },
};

// ==========================================
// PRODUCT HELPER FUNCTIONS
// ==========================================

export const productHelpers = {
  getStockStatus: (stockQuantity: number): string => {
    if (stockQuantity > 10) return 'In Stock';
    if (stockQuantity > 0) return 'Low Stock';
    return 'Out of Stock';
  },

  getMainImageUrl: (images: ProductImage[] | undefined, baseUrl: string): string => {
    if (!images || images.length === 0) return '';
    const mainImage = images.find(img => img.isMain) || images[0];
    return `${baseUrl.replace(/\/$/, '')}/${mainImage.imageUrl.replace(/^\//, '')}`;
  },

  formatProduct: (product: any, baseUrl: string) => ({
    ...product,
    status: productHelpers.getStockStatus(product.stockQuantity),
    image: productHelpers.getMainImageUrl(product.images, baseUrl),
    categoryName: product.categoryName || 'Uncategorized',
    brandName: product.brandName || 'No Brand',
  }),

  getDiscountPercentage: (oldPrice: number, currentPrice: number): number => {
    if (!oldPrice || oldPrice <= currentPrice) return 0;
    return Math.round(((oldPrice - currentPrice) / oldPrice) * 100);
  },

  isNewProduct: (product: Product): boolean => {
    if (!product.markAsNew) return false;
    
    const now = new Date();
    const startDate = product.markAsNewStartDate ? new Date(product.markAsNewStartDate) : null;
    const endDate = product.markAsNewEndDate ? new Date(product.markAsNewEndDate) : null;
    
    if (startDate && now < startDate) return false;
    if (endDate && now > endDate) return false;
    
    return true;
  },

  isAvailable: (product: Product): boolean => {
    const now = new Date();
    const startDate = product.availableStartDate ? new Date(product.availableStartDate) : null;
    const endDate = product.availableEndDate ? new Date(product.availableEndDate) : null;
    
    if (startDate && now < startDate) return false;
    if (endDate && now > endDate) return false;
    
    return true;
  },
};

// ==========================================
// EXPORT DEFAULT
// ==========================================

export default productsService;
