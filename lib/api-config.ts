// lib/api-config.ts
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:7196';
export const API_ENDPOINTS = {
  // Auth
  login: '/api/Auth/login',
  register: '/api/Auth/register',

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
  // Comments
blogComments: '/api/BlogComments',
};
