import axios from 'axios';

// ✅ FIXED - Use correct API URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://testapi.knowledgemarkg.com';


export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private client: any;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
      // ✅ FIXED - Remove httpsAgent (causing issues)
      // httpsAgent: false, // Remove this line
      validateStatus: (status) => {
        // Accept status codes from 200-299 and 400-499 (to handle API errors properly)
        return (status >= 200 && status < 300) || (status >= 400 && status < 500);
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config: any) => {
        // Log the full URL being called
        const fullUrl = `${config.baseURL}${config.url}`;
        console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${fullUrl}`);
        
        // ✅ FIXED - Check if we're in browser environment
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('authToken');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error: any) => {
        console.error('❌ Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: any) => {
        console.log(`✅ API Response: ${response.status} ${response.config?.url}`);
        console.log('📦 Response data:', response.data);
        return response;
      },
      (error: any) => {
        console.error(`❌ API Error: ${error.response?.status} ${error.config?.url}`, error.response?.data);
        
        // ✅ FIXED - Check if we're in browser environment
        if (error.response?.status === 401 && typeof window !== 'undefined') {
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: unknown,
    options?: any
  ): Promise<ApiResponse<T>> {
    try {
      console.log(`🔄 Making ${method} request to: ${endpoint}`);
      
      const response = await this.client({
        method,
        url: endpoint,
        data,
        ...options,
      });

      // Return successful response
      return { 
        data: response.data,
        message: 'Request successful'
      };
      
    } catch (error: any) {
      let errorMessage = 'An unknown error occurred';
      
      console.error('❌ Request failed:', {
        endpoint,
        method,
        error: error.message,
        status: error.response?.status,
        responseData: error.response?.data
      });
      
      if (error.response) {
        // Server responded with error status
        const errorData = error.response.data;
        errorMessage = errorData?.message || errorData?.error || `HTTP error! status: ${error.response.status}`;
        
        // For 404 errors, provide specific message
        if (error.response.status === 404) {
          errorMessage = `API endpoint not found: ${endpoint}`;
        }
      } else if (error.request) {
        // ✅ FIXED - Better network error message
        errorMessage = 'No response received from server';
      } else {
        // Error in setting up request
        errorMessage = error.message;
      }

      return { error: errorMessage };
    }
  }

  async get<T>(endpoint: string, options?: any): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  async post<T>(endpoint: string, body?: unknown, options?: any): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, body, options);
  }

  async put<T>(endpoint: string, body?: unknown, options?: any): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, body, options);
  }

  async delete<T>(endpoint: string, options?: any): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }

  // Utility methods
  setAuthToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', token);
    }
  }

  clearAuthToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
    }
  }

  // ✅ FIXED - File upload method with better FormData handling
  async uploadFile<T>(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
      });
    }

    // ✅ FIXED - Don't set Content-Type for FormData, let browser set it
    return this.request<T>('POST', endpoint, formData, {
      headers: {} // Remove 'Content-Type': 'multipart/form-data'
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
