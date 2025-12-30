// context/AuthContext.tsx
"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  dateOfBirth: string;
  gender: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  // ==================== INITIALIZE FROM LOCALSTORAGE ====================
  useEffect(() => {
    console.log("🔍 AuthContext: Initializing from localStorage...");
    
    const storedUser = localStorage.getItem("user");
    const storedAccess = localStorage.getItem("accessToken");
    const storedRefresh = localStorage.getItem("refreshToken");

    if (storedUser && storedAccess) {
      try {
        const parsedUser = JSON.parse(storedUser);
        
        console.log("✅ AuthContext: User restored from localStorage", {
          userId: parsedUser.id,
          email: parsedUser.email,
          name: `${parsedUser.firstName} ${parsedUser.lastName}`
        });

        setUser(parsedUser);
        setAccessToken(storedAccess);
        setRefreshToken(storedRefresh);

        // ⭐ SYNC SEPARATE VALUES FOR SIGNALR AND OTHER SERVICES
        if (!localStorage.getItem("userId")) {
          localStorage.setItem("userId", parsedUser.id);
          console.log("✅ userId synced to localStorage");
        }
        
        if (!localStorage.getItem("userEmail")) {
          localStorage.setItem("userEmail", parsedUser.email);
          console.log("✅ userEmail synced to localStorage");
        }
        
        if (!localStorage.getItem("userName")) {
          localStorage.setItem("userName", `${parsedUser.firstName} ${parsedUser.lastName}`);
          console.log("✅ userName synced to localStorage");
        }
        
        if (!localStorage.getItem("authToken")) {
          localStorage.setItem("authToken", storedAccess);
          console.log("✅ authToken synced to localStorage");
        }

      } catch (error) {
        console.error("❌ Error parsing stored user:", error);
        // Clear corrupted data
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      }
    } else {
      console.log("⚠️ No stored user/token found");
    }
  }, []);

  // ==================== LOGIN ====================
  const login = async (email: string, password: string) => {
    console.log("🔐 Login attempt for:", email);

    try {
      const res = await fetch("https://testapi.knowledgemarkg.com/api/Auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      // Handle error response
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        console.error("❌ Login failed:", errorData?.message || "Invalid credentials");
        throw {
          message: errorData?.message || "Invalid email or password",
        };
      }

      const data = await res.json();
      console.log("✅ Login successful, storing user data...");

      // ⭐ STORE ALL NECESSARY DATA
      // Main tokens
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("authToken", data.accessToken); // For SignalR
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));

      // ⭐ SEPARATE USER INFO FOR EASY ACCESS
      localStorage.setItem("userId", data.user.id);
      localStorage.setItem("userEmail", data.user.email);
      localStorage.setItem("userName", `${data.user.firstName} ${data.user.lastName}`);
      localStorage.setItem("userFirstName", data.user.firstName);
      localStorage.setItem("userLastName", data.user.lastName);

      // Remove guest email if exists
      localStorage.removeItem("guestEmail");

      console.log("✅ Stored to localStorage:", {
        userId: data.user.id,
        userEmail: data.user.email,
        userName: `${data.user.firstName} ${data.user.lastName}`,
        tokenLength: data.accessToken.length
      });

      // Update state
      setUser(data.user);
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);

      console.log("✅ Login complete!");

    } catch (error: any) {
      console.error("❌ Login error:", error);
      throw error;
    }
  };

  // ==================== REGISTER ====================
  const register = async (regData: any) => {
    console.log("📝 Registration attempt for:", regData.email);

    try {
      const res = await fetch("https://testapi.knowledgemarkg.com/api/Auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regData),
      });

      // Handle error response
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        console.error("❌ Registration failed:", errorData?.message || "Registration failed");
        throw {
          errors: errorData?.errors,
          message: errorData?.message || "Registration failed",
        };
      }

      const data = await res.json();
      console.log("✅ Registration successful, storing user data...");

      // ⭐ STORE ALL NECESSARY DATA
      // Main tokens
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("authToken", data.accessToken); // For SignalR
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));

      // ⭐ SEPARATE USER INFO FOR EASY ACCESS
      localStorage.setItem("userId", data.user.id);
      localStorage.setItem("userEmail", data.user.email);
      localStorage.setItem("userName", `${data.user.firstName} ${data.user.lastName}`);
      localStorage.setItem("userFirstName", data.user.firstName);
      localStorage.setItem("userLastName", data.user.lastName);

      console.log("✅ Stored to localStorage:", {
        userId: data.user.id,
        userEmail: data.user.email,
        userName: `${data.user.firstName} ${data.user.lastName}`,
        tokenLength: data.accessToken.length
      });

      // Update state
      setUser(data.user);
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);

      console.log("✅ Registration complete!");

    } catch (error: any) {
      console.error("❌ Registration error:", error);
      throw error;
    }
  };

  // ==================== LOGOUT ====================
  const logout = () => {
    console.log("🚪 Logging out...");

    // Clear all auth-related data
    const keysToRemove = [
      'user',
      'accessToken',
      'authToken',
      'refreshToken',
      'userId',
      'userEmail',
      'userName',
      'userFirstName',
      'userLastName',
      'guestEmail'
    ];

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    // Clear state
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);

    console.log("✅ Logout complete");
  };

  // ==================== CONTEXT VALUE ====================
  const contextValue: AuthContextType = {
    user,
    accessToken,
    refreshToken,
    login,
    register,
    logout,
    isAuthenticated: !!accessToken,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// ==================== CUSTOM HOOK ====================
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  return context;
};

// ==================== HELPER FUNCTIONS (OPTIONAL) ====================
// Export these if you need them in other components

export const getUserId = (): string | null => {
  return localStorage.getItem("userId");
};

export const getUserEmail = (): string | null => {
  return localStorage.getItem("userEmail");
};

export const getUserName = (): string | null => {
  return localStorage.getItem("userName");
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem("authToken") || localStorage.getItem("accessToken");
};

export const isUserAuthenticated = (): boolean => {
  return !!(localStorage.getItem("accessToken") && localStorage.getItem("userId"));
};
