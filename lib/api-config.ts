export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:7196';

export const API_ENDPOINTS = {
  // Auth
  login: `${API_BASE_URL}/api/Auth/login`,
  register: `${API_BASE_URL}/api/Auth/register`,

  // Categories
  categories: `${API_BASE_URL}/api/Categories`,

  // Brands
  brands: `${API_BASE_URL}/api/Brands`,

  // Products
  products: `${API_BASE_URL}/api/Products`,

  // Orders
  orders: `${API_BASE_URL}/api/Orders`,

  // Image Management
  imageManagement: `${API_BASE_URL}/api/ImageManagement`,

  // Customers
  customers: `${API_BASE_URL}/api/customers`,

  // Discounts
  discounts: `${API_BASE_URL}/api/Discounts`,

  // Banners
  banners: `${API_BASE_URL}/api/Banners`,
  uploadImage: `${API_BASE_URL}/api/upload-image`,
  deleteBannerImage: `${API_BASE_URL}/api/Banners/delete-image`,

  
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
