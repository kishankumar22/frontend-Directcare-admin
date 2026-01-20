// lib/api.ts
import axios, { AxiosInstance, AxiosError } from 'axios';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://testapi.knowledgemarkg.com';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  status?: number;
}

class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    // ✅ Validate and log base URL
    if (!baseURL || baseURL === 'undefined') {
      console.error('❌ Invalid API_BASE_URL:', baseURL);
      baseURL = 'https://testapi.knowledgemarkg.com';
    }

    console.log('🔧 API Client initialized with URL:', baseURL);

    this.client = axios.create({
      baseURL,
      timeout: 120000, // 2 minutes
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      validateStatus: (status) => status < 500,
      // ✅ Add withCredentials for CORS
      withCredentials: false,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // ✅ REQUEST INTERCEPTOR
    this.client.interceptors.request.use(
      (config) => {
        config.maxContentLength = Infinity;
        config.maxBodyLength = Infinity;

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

    // ✅ RESPONSE INTERCEPTOR - ENHANCED
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ API Response: ${response.status} ${response.config?.url}`);

        if (response.status >= 400 && response.status < 500) {
          console.warn(`⚠️ Client error: ${response.status}`, response.data);
        }

        return response;
      },
      (error: AxiosError) => {
        // ✅ DETAILED ERROR LOGGING
        console.group('🚨 API ERROR DETAILS');
        console.log('Error Code:', error.code);
        console.log('Error Message:', error.message);
        console.log('Has Response?', !!error.response);
        console.log('Has Request?', !!error.request);

        if (error.config) {
          console.log('Request URL:', `${error.config.baseURL}${error.config.url}`);
          console.log('Request Method:', error.config.method?.toUpperCase());
        }

        if (error.response) {
          // ✅ Server responded with error
          console.log('Response Status:', error.response.status);
          console.log('Response Data:', error.response.data);
          console.log('Response Headers:', error.response.headers);
        } else if (error.request) {
          // ✅ No response received
          console.log('Request Made:', 'Yes');
          console.log('Response Received:', 'No');
          console.log('Possible Issues:', [
            '1. Server is down or not responding',
            '2. CORS policy blocking request',
            '3. Network/Internet connection issue',
            '4. Firewall blocking request',
            '5. Invalid API URL'
          ]);
        }

        console.groupEnd();

        // ✅ Handle 401 Unauthorized
        if (error.response?.status === 401 && typeof window !== 'undefined') {
          console.warn('⚠️ Unauthorized - Redirecting to login');
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
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        ...options,
      });

      // ✅ Handle API success: false
      if (response.data?.success === false) {
        const apiError = response.data?.message || response.data?.error || 'API operation failed';
        return {
          error: apiError,
          status: response.status,
          data: response.data
        };
      }

      // ✅ Handle 4xx errors
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
      // ✅ ENHANCED ERROR HANDLING
      const errorDetails = {
        endpoint: endpoint || 'unknown',
        method: method || 'unknown',
        message: error?.message || 'Unknown error',
        code: error?.code || 'NO_CODE',
        status: error?.response?.status || 'NO_STATUS',
        responseData: error?.response?.data || null
      };

      console.error('❌ Request failed:', JSON.stringify(errorDetails, null, 2));

      let errorMessage = 'An unexpected error occurred';
      let status = error?.response?.status;

      // ✅ Error Response Scenarios
      if (error?.response) {
        // Server responded with error status
        const errorData = error.response.data;

        errorMessage =
          errorData?.message ||
          errorData?.error ||
          errorData?.errors?.[0] ||
          `HTTP ${error.response.status}: ${error.response.statusText}`;

        switch (error.response.status) {
          case 400:
            errorMessage = errorData?.message || 'Bad request. Please check your input.';
            break;
          case 401:
            errorMessage = 'Unauthorized. Please login again.';
            break;
          case 403:
            errorMessage = 'Access forbidden. You do not have permission.';
            break;
          case 404:
            errorMessage = `Endpoint not found: ${endpoint}`;
            break;
          case 413:
            errorMessage = 'Request too large. Server limit exceeded.';
            break;
          case 500:
            errorMessage = 'Internal server error. Please try again later.';
            break;
          case 502:
            errorMessage = 'Bad Gateway. Server is temporarily unavailable.';
            break;
          case 503:
            errorMessage = 'Service unavailable. Please try again later.';
            break;
        }

      } else if (error?.request) {
        // ✅ Request made but no response
        switch (error.code) {
          case 'ERR_NETWORK':
            errorMessage = '🔴 Network Error\n\n' +
              'Cannot connect to server. Please check:\n\n' +
              '1. ✅ Backend server is running\n' +
              '2. ✅ API URL is correct: ' + this.client.defaults.baseURL + '\n' +
              '3. ✅ CORS is enabled on backend\n' +
              '4. ✅ Internet connection is active\n' +
              '5. ✅ Firewall is not blocking';
            break;

          case 'ERR_FR_MAX_BODY_LENGTH_EXCEEDED':
            errorMessage = 'Request data too large. Check server configuration.';
            break;

          case 'ECONNABORTED':
            errorMessage = 'Request timeout (2 min). Connection is slow or data is too large.';
            break;

          case 'ECONNREFUSED':
            errorMessage = 'Connection refused. Server is not running or not accessible.';
            break;

          case 'ENOTFOUND':
            errorMessage = 'Server not found. Check API URL: ' + this.client.defaults.baseURL;
            break;

          default:
            errorMessage = 'No response from server. Please check your connection.';
        }

      } else {
        // ✅ Request setup error
        errorMessage = error?.message || 'Failed to setup request';
      }

      return {
        error: errorMessage,
        status
      };
    }
  }

  // ✅ HTTP METHODS
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

  // ✅ AUTH TOKEN METHODS
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

  // ✅ FILE UPLOAD METHODS
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
      maxContentLength: Infinity,
      maxBodyLength: Infinity
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
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
  }

  // ✅ CONNECTION TEST
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      console.log('🔍 Testing connection to:', this.client.defaults.baseURL);

      const response = await this.client.get('/health', {
        timeout: 5000
      });

      return {
        success: true,
        message: 'Connection successful',
        details: {
          status: response.status,
          baseURL: this.client.defaults.baseURL
        }
      };
    } catch (error: any) {
      let message = 'Connection failed';
      let details: any = {
        baseURL: this.client.defaults.baseURL,
        code: error.code
      };

      if (error.code === 'ECONNREFUSED') {
        message = 'Server is not running or refusing connections';
        details.suggestion = `Start your backend server at ${this.client.defaults.baseURL}`;
      } else if (error.code === 'ERR_NETWORK') {
        message = 'Network error - Cannot reach server';
        details.suggestion = 'Check:\n1. Backend is running\n2. CORS is enabled\n3. Internet connection\n4. Firewall settings';
      } else if (error.code === 'ENOTFOUND') {
        message = 'Server URL not found';
        details.suggestion = `Verify API_BASE_URL: ${this.client.defaults.baseURL}`;
      } else {
        message = error.message || 'Unknown error';
      }

      console.error('❌ Connection test failed:', message, details);

      return {
        success: false,
        message,
        details
      };
    }
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export { ApiClient };
