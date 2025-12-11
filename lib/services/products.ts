// lib/services/products.service.ts
import { apiClient } from '../api';
import { API_ENDPOINTS } from '../api-config';

// ==========================================
// INTERFACES
// ==========================================


 export interface ProductImage {
  id: string;
  imageUrl: string;  // This should be 'imageUrl', not 'url'
  altText: string;
  sortOrder: number;  // This should be 'sortOrder', not 'displayOrder'
  isMain: boolean;
  fileName?: string;
  fileSize?: number;
  file?: File; // For storing actual file during upload
}
export interface ProductAttribute {
  id: string;
  name: string;
  value: string;
  displayOrder: number;
  sortOrder?:number
  displayName?:string
}

// ===== ADD THESE INTERFACES =====
export interface VATRateData {
  id: string;
  name: string;
  rate: number;
  isActive?: boolean;
  displayOrder?: number;
}

 export interface VATRateApiResponse {
  success: boolean;
  message: string;
  data: VATRateData[];
  errors: null;
}
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
  option3Name?: string | null;
  option3Value?: string | null;
  imageUrl: string | null;
  isDefault: boolean;
  displayOrder: number;
  isActive: boolean;
  imageFile?: File; // For storing the actual file
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

// ✅ Update DropdownsData interface
export interface DropdownsData {
  brands: BrandData[];
  categories: CategoryData[];
  vatRates: VATRateData[];  // ✅ Add this
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
  
  // Basic info
  shortDescription: string;
  description: string;
  categoryId: string;
  categoryName: string;
  brandId?: string;
  brandName: string;
  productType: string;
  
  // Pricing
  price: number;
  oldPrice?: number;
  compareAtPrice?: number;
  costPrice?: number;
  callForPrice?: boolean;
  customerEntersPrice?: boolean;
  minimumCustomerEnteredPrice?: number;
  maximumCustomerEnteredPrice?: number;
  
  // Inventory
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
  
  // Shipping & Dimensions
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
  
  // Visibility & Settings
  isPublished: boolean;
  publishedAt?: string;
  visibleIndividually?: boolean;
  showOnHomepage?: boolean;
  displayOrder?: number;
  disableBuyButton?: boolean;
  disableWishlistButton?: boolean;
  
  // Marketing
  markAsNew?: boolean;
  markAsNewStartDate?: string;
  markAsNewEndDate?: string;
  availableStartDate?: string;
  availableEndDate?: string;
  
  // Tax
  taxExempt?: boolean;
  taxCategoryId?: string;
  
  // SEO
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  searchEngineFriendlyPageName?: string;
  tags?: string;
  
  // Reviews & Stats
  averageRating?: number;
  reviewCount?: number;
  viewCount?: number;
  allowCustomerReviews?: boolean;
  
  // Media
  videoUrls?: string;
  specificationAttributes?: string;
  
  // Relations
  relatedProductIds?: string;
  crossSellProductIds?: string;
  
  // Admin
  adminComment?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  
  // Nested data
  images?: ProductImage[];
  attributes?: ProductAttribute[];
  variants?: ProductVariant[];
 
  // Populated related products
  relatedProducts?: RelatedProduct[];
  crossSellProducts?: RelatedProduct[];
}
// API response interfaces को properly define करें
export interface BrandApiResponse {
  success: boolean;
  message: string;
  data: BrandData[];
  errors: null;
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
  
  // Optional fields
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
  name(arg0: string, name: any): unknown;
  success: boolean;
  data: T;
  message?: string;
}

// ==========================================
// PRODUCTS SERVICE
// ==========================================

export const productsService = {
  /**
   * Get all products with pagination and filters
   */
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

  /**
   * Get single product by ID with full details
   */
  getById: async (id: string) => {
    return apiClient.get<ApiResponse<Product>>(`${API_ENDPOINTS.products}/${id}`);
  },

  /**
   * Create a new product
   */
  create: async (data: CreateProductDto) => {
    return apiClient.post<ApiResponse<Product>>(API_ENDPOINTS.products, data);
  },

  /**
   * Update existing product
   */
  update: async (id: string, data: UpdateProductDto) => {
    return apiClient.put<ApiResponse<Product>>(`${API_ENDPOINTS.products}/${id}`, data);
  },

  /**
   * Delete product
   */
  delete: async (id: string) => {
    return apiClient.delete<ApiResponse<void>>(`${API_ENDPOINTS.products}/${id}`);
  },

  /**
   * Get products by category
   */
  getByCategory: async (categoryId: string, params?: Omit<ProductQueryParams, 'categoryId'>) => {
    return productsService.getAll({ ...params, categoryId });
  },

  /**
   * Get products by brand
   */
  getByBrand: async (brandId: string, params?: Omit<ProductQueryParams, 'brandId'>) => {
    return productsService.getAll({ ...params, brandId });
  },

  // ==========================================
  // IMAGE MANAGEMENT (from your API endpoints)
  // ==========================================

  /**
   * Add images to product - POST /api/Products/{id}/images
   */
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

  /**
   * Delete product image - DELETE /api/Products/images/{imageId}
   */
  deleteImage: async (imageId: string) => {
    return apiClient.delete<ApiResponse<void>>(
      `${API_ENDPOINTS.products}/images/${imageId}`
    );
  },

  /**
   * Create product with images - POST /api/Products/with-images
   */
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
  // VARIANT MANAGEMENT
  // ==========================================

  /**
   * Add image to variant - POST /api/Products/variants/{variantId}/image
   */
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

  /**
   * Create product with variants - POST /api/Products/with-variants
   */
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
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

export const productHelpers = {
  /**
   * Get stock status based on quantity
   */
  getStockStatus: (stockQuantity: number): string => {
    if (stockQuantity > 10) return 'In Stock';
    if (stockQuantity > 0) return 'Low Stock';
    return 'Out of Stock';
  },

  /**
   * Get main product image URL
   */
  getMainImageUrl: (images: ProductImage[] | undefined, baseUrl: string): string => {
    if (!images || images.length === 0) return '';
    const mainImage = images.find(img => img.isMain) || images[0];
    return `${baseUrl.replace(/\/$/, '')}/${mainImage.imageUrl.replace(/^\//, '')}`;
  },

  /**
   * Format product for display
   */
  formatProduct: (product: any, baseUrl: string) => ({
    ...product,
    status: productHelpers.getStockStatus(product.stockQuantity),
    image: productHelpers.getMainImageUrl(product.images, baseUrl),
    categoryName: product.categoryName || 'Uncategorized',
    brandName: product.brandName || 'No Brand',
  }),

  /**
   * Calculate discount percentage
   */
  getDiscountPercentage: (oldPrice: number, currentPrice: number): number => {
    if (!oldPrice || oldPrice <= currentPrice) return 0;
    return Math.round(((oldPrice - currentPrice) / oldPrice) * 100);
  },

  /**
   * Check if product is new
   */
  isNewProduct: (product: Product): boolean => {
    if (!product.markAsNew) return false;
    
    const now = new Date();
    const startDate = product.markAsNewStartDate ? new Date(product.markAsNewStartDate) : null;
    const endDate = product.markAsNewEndDate ? new Date(product.markAsNewEndDate) : null;
    
    if (startDate && now < startDate) return false;
    if (endDate && now > endDate) return false;
    
    return true;
  },

  /**
   * Check if product is available
   */
  isAvailable: (product: Product): boolean => {
    const now = new Date();
    const startDate = product.availableStartDate ? new Date(product.availableStartDate) : null;
    const endDate = product.availableEndDate ? new Date(product.availableEndDate) : null;
    
    if (startDate && now < startDate) return false;
    if (endDate && now > endDate) return false;
    
    return true;
  },
};
