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

  // Customers
  customers: `${API_BASE_URL}/api/customers`,
};

export default API_BASE_URL;
