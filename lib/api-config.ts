export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:7196';

export const API_ENDPOINTS = {
  // Auth
  login: `${API_BASE_URL}/api/auth/login`,
  register: `${API_BASE_URL}/api/auth/register`,

  // Categories
  categories: `${API_BASE_URL}/api/categories`,

  // Brands
  brands: `${API_BASE_URL}/api/brands`,

  // Manufacturers
  manufacturers: `${API_BASE_URL}/api/manufacturers`,

  // Products
  products: `${API_BASE_URL}/api/products`,

  // Orders
  orders: `${API_BASE_URL}/api/orders`,

  // Image Management
  imageManagement: `${API_BASE_URL}/api/ImageManagement`,

  // Customers
  customers: `${API_BASE_URL}/api/customers`,

  // Discounts
  discounts: `${API_BASE_URL}/api/discounts`,

  // Banners
  banners: `${API_BASE_URL}/api/banners`,
  uploadImage: `${API_BASE_URL}/api/upload-image`,
  deleteImage: `${API_BASE_URL}/api/Banners/delete-image`,

  
  //BlogCategories
  blogCategories: `${API_BASE_URL}/api/BlogCategories`,
  deleteBlogCategoryImage: `${API_BASE_URL}/api/BlogCategories/delete-image`,

  //BlogPosts
  blogPosts: `${API_BASE_URL}/api/BlogPosts`,
  deleteBlogPostImage: `${API_BASE_URL}/api/BlogPosts/delete-image`,
  
  
  //comments
  comments: `${API_BASE_URL}/api/comments`,
};

export default API_BASE_URL;
