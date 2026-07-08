"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { authService } from "@/lib/services/auth";

export interface AuthUser {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  permissions?: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  accessToken: string | null;
  isAuthenticated: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [accessToken, setAccessToken] =
    useState<string | null>(null);

  useEffect(() => {
    const loadUserData = () => {
      try {
        const token = localStorage.getItem("authToken");

        const storedUserData =
          localStorage.getItem("userData");

        setAccessToken(token);

        let roleFromToken = "";
        if (token) {
          try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const decoded = typeof window !== "undefined" ? window.atob(base64) : Buffer.from(base64, 'base64').toString('binary');
            const jsonPayload = decodeURIComponent(
              decoded
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
            );
            const payload = JSON.parse(jsonPayload);
            roleFromToken = payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || payload.role || "";

            // Token expiry check — if the JWT is expired, treat as logged out so the
            // AdminLayout guard redirects to /login (instead of appearing "stuck").
            const expSec = typeof payload.exp === "number" ? payload.exp : 0;
            if (expSec && Date.now() >= expSec * 1000) {
              localStorage.removeItem("authToken");
              setAccessToken(null);
              setUser(null);
              setIsLoading(false);
              return;
            }
          } catch (e) {
            console.error("Failed to parse JWT role in context:", e);
          }
        }

        if (storedUserData) {
          const userData = JSON.parse(storedUserData);

          setUser({
            id: userData.id,

            firstName:
              userData.firstName || "",

            lastName:
              userData.lastName || "",

            email:
              userData.email ||
              localStorage.getItem(
                "userEmail"
              ) ||
              "",

            role:
              roleFromToken || userData.role || "admin",

            permissions:
              userData.permissions || [],
          });
        } else {
          const email =
            localStorage.getItem(
              "userEmail"
            );

          if (email) {
            setUser({
              email,

              firstName:
                localStorage.getItem(
                  "userFirstName"
                ) || "",

              lastName:
                localStorage.getItem(
                  "userLastName"
                ) || "",

              role: roleFromToken || "admin",
            });
          }
        }
      } catch (error) {
        console.error(
          "Error loading user data:",
          error
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, []);

  // Proactively watch for token expiry: check every 30s (and when the tab regains focus)
  // so an expired session redirects to /login even without an API call.
  useEffect(() => {
    const checkExpiry = () => {
      const token = localStorage.getItem("authToken");
      if (!token) return;
      try {
        const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(window.atob(base64));
        const expSec = typeof payload.exp === "number" ? payload.exp : 0;
        if (expSec && Date.now() >= expSec * 1000) {
          localStorage.removeItem("authToken");
          setAccessToken(null);
          setUser(null);
        }
      } catch {
        /* malformed token — ignore */
      }
    };

    const interval = setInterval(checkExpiry, 30000);
    window.addEventListener("focus", checkExpiry);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", checkExpiry);
    };
  }, []);

  const handleLogout = () => {

    // Clear React State
    setUser(null);

    setAccessToken(null);

    // Centralized Logout
    authService.logout();
  };

  const value: AuthContextType = {
    user,

    isLoading,

    accessToken,

    isAuthenticated:
      !!user && !!accessToken,

    logout: handleLogout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return ctx;
};