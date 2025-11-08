// lib/api.ts
import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://testapi.knowledgemarkg.com';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  status?: number;
}

class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 60000, // ✅ Increased to 60 seconds
      headers: {
        'Content-Type': 'application/json',
      },
      // ✅ CRITICAL FIX: Increase body size limits
      maxContentLength: 100 * 1024 * 1024, // 100MB response limit
      maxBodyLength: 100 * 1024 * 1024,    // 100MB request limit
      validateStatus: (status) => {
        return status < 500;
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // REQUEST INTERCEPTOR
    this.client.interceptors.request.use(
      (config) => {
        const fullUrl = `${config.baseURL}${config.url}`;
        console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${fullUrl}`);
        
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('authToken');
          if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        
        return config;
      },
      (error) => {
        console.error('❌ Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // RESPONSE INTERCEPTOR
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ API Response: ${response.status} ${response.config?.url}`);
        
        if (response.status >= 400 && response.status < 500) {
          console.warn(`⚠️ Client error: ${response.status}`, response.data);
        }
        
        return response;
      },
      (error: AxiosError) => {
        if (error.response) {
          console.error(`❌ API Error: ${error.response.status} ${error.config?.url}`, {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data
          });
        } else if (error.request) {
          console.error('❌ Network Error:', {
            message: error.message,
            code: error.code
          });
        } else {
          console.error('❌ Request Setup Error:', error.message);
        }
        
        // ✅ Handle 413 Payload Too Large
        if (error.response?.status === 413) {
          console.error('❌ 413: Payload Too Large - Data size exceeds server limit');
        }
        
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

      if (response.data?.success === false) {
        const apiError = response.data?.message || response.data?.error || 'API operation failed';
        return { 
          error: apiError,
          status: response.status,
          data: response.data 
        };
      }

      if (response.status >= 400 && response.status < 500) {
        const errorMessage = response.data?.message || 
                            response.data?.error || 
                            `Request failed with status ${response.status}`;
        return { 
          error: errorMessage,
          status: response.status 
        };
      }

      return { 
        data: response.data,
        message: 'Request successful',
        status: response.status
      };
      
    } catch (error: any) {
      const errorDetails = {
        endpoint,
        method,
        message: error.message,
        code: error.code,
        status: error.response?.status,
        responseData: error.response?.data
      };

      console.error('❌ Request failed:', errorDetails);
      
      let errorMessage = 'An unexpected error occurred';
      let status = error.response?.status;
      
      if (error.response) {
        const errorData = error.response.data;
        
        errorMessage = 
          errorData?.message || 
          errorData?.error || 
          errorData?.errors?.[0] ||
          `HTTP ${error.response.status}: ${error.response.statusText}`;
        
        // ✅ Specific error messages
        if (error.response.status === 413) {
          errorMessage = 'Request too large. Please reduce the amount of data or compress images.';
        } else if (error.response.status === 404) {
          errorMessage = `Endpoint not found: ${endpoint}`;
        } else if (error.response.status === 500) {
          errorMessage = 'Internal server error. Please try again later.';
        } else if (error.response.status === 400) {
          errorMessage = errorData?.message || 'Bad request. Please check your input.';
        }
        
      } else if (error.request) {
        // ✅ Check for body size errors
        if (error.code === 'ERR_FR_MAX_BODY_LENGTH_EXCEEDED') {
          errorMessage = 'Request data is too large. Please reduce the size or compress content.';
        } else if (error.code === 'ECONNABORTED') {
          errorMessage = 'Request timeout. Please check your connection.';
        } else if (error.code === 'ERR_NETWORK') {
          errorMessage = 'Network error. Please check your internet connection.';
        } else {
          errorMessage = 'No response from server. Please try again.';
        }
      } else {
        errorMessage = error.message || 'Failed to setup request';
      }

      return { 
        error: errorMessage,
        status 
      };
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

  async patch<T>(endpoint: string, body?: unknown, options?: any): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, body, options);
  }

  async delete<T>(endpoint: string, options?: any): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }

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

  getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken');
    }
    return null;
  }

  async uploadFile<T>(
    endpoint: string, 
    file: File, 
    additionalData?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    return this.request<T>('POST', endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      maxContentLength: 100 * 1024 * 1024,
      maxBodyLength: 100 * 1024 * 1024
    });
  }

  async uploadMultipleFiles<T>(
    endpoint: string,
    files: File[],
    additionalData?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    
    files.forEach((file) => {
      formData.append('files', file);
    });
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    return this.request<T>('POST', endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      maxContentLength: 100 * 1024 * 1024,
      maxBodyLength: 100 * 1024 * 1024
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export { ApiClient };
