import { apiClient } from "../api";
import { API_ENDPOINTS } from "../api-config";

// ---- Login Request DTO ----
export interface LoginDto {
  email: string;
  password: string;
}

// ---- Login Response ----
export interface LoginResponse {
  success: boolean;
  message?: string;
  accessToken?: string;
  token?: string;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  };
}

// ✅ Helper function to get cookie value
const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
};

// ✅ Helper function to decode JWT and check expiry
const isTokenExpired = (token: string): boolean => {
  try {
    // JWT structure: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return true; // Invalid token format
    }

    // Decode payload (base64)
    const payload = JSON.parse(atob(parts[1]));
    
    // Check if 'exp' exists
    if (!payload.exp) {
      return false; // No expiry means token doesn't expire (not recommended but handle it)
    }

    // Compare expiry time with current time
    const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
    return payload.exp < currentTime;
  } catch (error) {
    console.error("Error decoding token:", error);
    return true; // If decode fails, consider token expired
  }
};

export const authService = {
  // ---- LOGIN ----
  login: (data: LoginDto, config: any = {}) =>
    apiClient.post<LoginResponse>(API_ENDPOINTS.login, data, config),

  // ---- LOGOUT ----
  logout: () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userData");
    document.cookie = "authToken=; path=/; max-age=0";
    
    // ✅ Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },

  // ✅ Check authentication with token expiry validation (Synchronous)
  isAuthenticated: (): boolean => {
    try {
      // Check if cookie exists
      const token = getCookie('authToken');
      
      if (!token) {
        return false;
      }

      // Check if token is expired
      if (isTokenExpired(token)) {
        // Auto logout if expired
        authService.logout();
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error checking authentication:", error);
      return false;
    }
  },

  // ✅ Alias for backward compatibility (same as isAuthenticated)
  isAuthenticatedSync: (): boolean => {
    return authService.isAuthenticated();
  },

  // ✅ Get token from cookie
  getToken: (): string | null => {
    return getCookie('authToken');
  },

  // ✅ Get token expiry time
  getTokenExpiry: (): Date | null => {
    try {
      const token = getCookie('authToken');
      if (!token) return null;

      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(atob(parts[1]));
      
      if (!payload.exp) return null;

      return new Date(payload.exp * 1000); // Convert to milliseconds
    } catch (error) {
      console.error("Error getting token expiry:", error);
      return null;
    }
  },

  // ✅ Check if token will expire soon (within next 5 minutes)
  isTokenExpiringSoon: (minutesThreshold: number = 5): boolean => {
    try {
      const token = getCookie('authToken');
      if (!token) return false;

      const parts = token.split('.');
      if (parts.length !== 3) return false;

      const payload = JSON.parse(atob(parts[1]));
      
      if (!payload.exp) return false;

      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = payload.exp - currentTime;
      
      return timeUntilExpiry < (minutesThreshold * 60);
    } catch (error) {
      console.error("Error checking token expiry:", error);
      return false;
    }
  }
};
