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

export const authService = {
  // ---- LOGIN ----
  login: (data: LoginDto, config: any = {}) =>
    apiClient.post<LoginResponse>(API_ENDPOINTS.login, data, config),

  // ---- LOGOUT (optional) ----
  logout: () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userData");
    document.cookie = "authToken=; path=/; max-age=0";
  },
  
  isAuthenticated: () => {
    return document.cookie.includes('authToken=');
  }
};
