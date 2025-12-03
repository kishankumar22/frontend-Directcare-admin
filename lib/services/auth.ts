import { apiClient } from "../api";
import { API_ENDPOINTS } from "../api-config";

// ---- Login Request DTO ----
export interface LoginDto {
  email: string;
  password: string;
}

// ---- User Interface ----
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role?: string;
}

// ---- Login Response ----
export interface LoginResponse {
  success: boolean;
  message?: string;
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  user?: User;
}

// ---- Refresh Token Response ----
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// ✅ Helper: get cookie value
const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || null;
  }
  return null;
};

// ✅ Helper: set cookie value
const setCookie = (name: string, value: string, days: number = 7): void => {
  const expires = new Date(
    Date.now() + days * 24 * 60 * 60 * 1000
  ).toUTCString();
  document.cookie = `${name}=${value}; path=/; expires=${expires}; SameSite=Lax`;
};

// ✅ Helper: decode JWT and check expiry
const isTokenExpired = (token: string): boolean => {
  try {
    // JWT structure: header.payload.signature
    const parts = token.split(".");
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
login: async (data: LoginDto, config: any = {}): Promise<any> => {
  const response = await apiClient.post<LoginResponse>(
    API_ENDPOINTS.login,
    data,
    config
  );

  // ✅ Safe access with optional chaining
  if (response.data?.accessToken) {
    setCookie("authToken", response.data.accessToken);
    localStorage.setItem("authToken", response.data.accessToken);
  }

  if (response.data?.refreshToken) {
    setCookie("refreshToken", response.data.refreshToken);
  }

  if (response.data?.user?.email) {
    localStorage.setItem("userEmail", response.data.user.email);
    localStorage.setItem("userData", JSON.stringify(response.data.user));
  }

  return response;
},

  // ---- LOGOUT ----
  logout: (): void => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userData");
    document.cookie = "authToken=; path=/; max-age=0";
    document.cookie = "refreshToken=; path=/; max-age=0";

    // ✅ Redirect to login page
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  },

  // ✅ Check authentication with token expiry validation (Synchronous)
  isAuthenticated: (): boolean => {
    try {
      // Check if cookie exists
      const token = getCookie("authToken");

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
    return getCookie("authToken");
  },

  // ✅ Get token expiry time
  getTokenExpiry: (): Date | null => {
    try {
      const token = getCookie("authToken");
      if (!token) return null;

      const parts = token.split(".");
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
      const token = getCookie("authToken");
      if (!token) return false;

      const parts = token.split(".");
      if (parts.length !== 3) return false;

      const payload = JSON.parse(atob(parts[1]));

      if (!payload.exp) return false;

      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = payload.exp - currentTime;

      return timeUntilExpiry < minutesThreshold * 60;
    } catch (error) {
      console.error("Error checking token expiry:", error);
      return false;
    }
  },
// ✅ REFRESH TOKEN: call /api/Auth/refresh-token
refreshToken: async (): Promise<{
  accessToken: string;
  refreshToken: string;
  user: User;
} | null> => {
  try {
    const accessToken = getCookie("authToken");
    const refreshToken = getCookie("refreshToken");

    if (!accessToken || !refreshToken) {
      console.warn("No tokens found for refresh");
      authService.logout();
      return null;
    }

    const response = await apiClient.post<RefreshTokenResponse>(
      API_ENDPOINTS.refreshToken,
      {
        accessToken,
        refreshToken,
      }
    );

    // ✅ Safe access with optional chaining + null checks
    const newAccessToken = response.data?.accessToken;
    const newRefreshToken = response.data?.refreshToken;
    const user = response.data?.user;

    // ✅ Check all required fields including user
    if (!newAccessToken || !newRefreshToken || !user) {
      console.error("Invalid refresh token response");
      authService.logout();
      return null;
    }

    // Save new tokens
    setCookie("authToken", newAccessToken);
    localStorage.setItem("authToken", newAccessToken);
    setCookie("refreshToken", newRefreshToken);

    // Update user data
    localStorage.setItem("userData", JSON.stringify(user));
    if (user.email) {
      localStorage.setItem("userEmail", user.email);
    }

    console.log("Token refreshed successfully");

    // ✅ TypeScript ab samajh gaya ki user undefined nahi hai (upar check hai)
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user, // Now TypeScript knows user is defined
    };
  } catch (error) {
    console.error("Error refreshing token:", error);
    authService.logout();
    return null;
  }
},


  // ✅ Ensure token is valid before API call
  ensureValidToken: async (): Promise<string | null> => {
    const token = getCookie("authToken");
    if (!token) {
      return null;
    }

    // If token is expired, try to refresh
    if (isTokenExpired(token)) {
      console.log("Token expired, attempting refresh...");
      const refreshed = await authService.refreshToken();
      return refreshed?.accessToken || null;
    }

    // If token about to expire soon, refresh it
    if (authService.isTokenExpiringSoon(5)) {
      console.log("Token expiring soon, refreshing...");
      const refreshed = await authService.refreshToken();
      return refreshed?.accessToken || null;
    }

    return token;
  },
};
