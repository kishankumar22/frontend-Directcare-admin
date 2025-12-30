// lib/api-config.ts
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://testapi.knowledgemarkg.com';

export const API_ENDPOINTS = {
  // Auth
  login: '/api/Auth/login',
  register: '/api/Auth/register',
  refreshToken: '/api/Auth/refresh-token',
  changePassword: '/api/Auth/change-password',

  // Categories
  categories: '/api/Categories',
  uploadCategoryImage: '/api/Categories/upload-image',
  deleteCategoryImage: '/api/ImageManagement/category',

  // Brands
  brands: '/api/Brands',
  uploadBrandLogo: '/api/Brands/upload-logo',
  deleteBrandLogo: '/api/ImageManagement/brand',

  // Products
  products: '/api/Products',
  
  // 🆕 Product Lock & Takeover System
  productLock: {
    acquireLock: (productId: string) => `/api/Products/${productId}/acquire-lock`,
    releaseLock: (productId: string) => `/api/Products/${productId}/release-lock`,
    lockStatus: (productId: string) => `/api/Products/${productId}/lock-status`,
    requestTakeover: (productId: string) => `/api/Products/${productId}/request-takeover`,
    pendingTakeoverRequests: '/api/Products/pending-takeover-requests',
    myTakeoverRequests: '/api/Products/my-takeover-requests',
    approveTakeover: (requestId: string) => `/api/Products/takeover-requests/${requestId}/approve`,
    rejectTakeover: (requestId: string) => `/api/Products/takeover-requests/${requestId}/reject`,
    cancelTakeover: (requestId: string) => `/api/Products/takeover-requests/${requestId}/cancel`,
  },

  // Orders
  orders: '/api/Orders',

  // Image Management
  imageManagement: '/api/ImageManagement',

  // Customers
  customers: '/api/customers',

  // Discounts
  discounts: '/api/Discounts',

  // Banners
  banners: '/api/Banners',
  uploadBannerImage: '/api/Banners/upload-image',
  deleteBannerImage: '/api/Banners/delete-image',

  // BlogCategories
  blogCategories: '/api/BlogCategories',
  deleteBlogCategoryImage: '/api/BlogCategories/delete-image',
  uploadBlogCategoryImage: '/api/BlogCategories/upload-image',

  // BlogPosts
  blogPosts: '/api/BlogPosts',
  uploadBlogPostImage: '/api/BlogPosts/upload-image',
  deleteBlogPostImage: '/api/BlogPosts/delete-image',

  // VAT Rates
  vatrates: '/api/VATRates',

  // Product Reviews
  productReviews: '/api/ProductReviews',

  subscriptions: '/api/Subscriptions',
  
  // Comments
  blogComments: '/api/BlogComments',
};
