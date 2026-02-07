"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface Address {
  id: string;
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phoneNumber?: string;
  isDefault: boolean;
}

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  orderDate: string;
  totalAmount: number;
  currency: string;
  itemsCount: number;
}
export type LoyaltyTier = "Bronze" | "Silver" | "Gold";

export interface LoyaltyPoints {
  currentBalance: number;
  redemptionValue: number;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  totalPointsExpired: number;
  tierLevel: LoyaltyTier; // ✅ FIXED
  pointsToNextTier: number;
  lastEarnedAt?: string;
  lastRedeemedAt?: string;
  expiringPoints?: any[];
}


interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  phoneNumber?: string;

  dateOfBirth?: string;
  gender?: string;

  createdAt?: string;
  lastLoginAt?: string;
  isActive?: boolean;

  profileImageUrl?: string;
  // ✅ ADD THIS
  loyaltyPoints?: LoyaltyPoints;
  addresses?: any[];
  orders?: any[];
  totalOrders?: number;
  totalSpent?: number;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>; // ✅ ADD THIS
}



const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
const [profileLoading, setProfileLoading] = useState(false);

  // 🔁 Restore session
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedAccess = localStorage.getItem("accessToken");
    const storedRefresh = localStorage.getItem("refreshToken");

    if (storedUser && storedAccess) {
      setUser(JSON.parse(storedUser));
      setAccessToken(storedAccess);
      setRefreshToken(storedRefresh);
    }
  }, []);
const fetchProfile = async () => {
  if (!accessToken || !user?.email) return;

  try {
    const res = await fetch(
      `https://testapi.knowledgemarkg.com/api/Customers/by-email/${encodeURIComponent(
        user.email
      )}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (res.status === 401) {
      logout();
      return;
    }

    if (!res.ok) return;

    const json = await res.json();
    if (json?.success && json.data) {
      setUser(json.data);
      localStorage.setItem("user", JSON.stringify(json.data));
    }
  } catch (e) {
    console.error(e);
  }
};

useEffect(() => {
  if (!accessToken || !user?.email) return;

  const initLoad = async () => {
    setProfileLoading(true);
    await fetchProfile();
    setProfileLoading(false);
  };

  initLoad();
}, [accessToken, user?.email]);



  // 🔐 LOGIN (UNCHANGED)
 const login = async (email: string, password: string) => {
  const res = await fetch(
    "https://testapi.knowledgemarkg.com/api/Auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw {
      message: errorData?.message || "Invalid email or password",
    };
  }

  const data = await res.json();

  localStorage.removeItem("guestEmail");

  localStorage.setItem("accessToken", data.accessToken);
  localStorage.setItem("refreshToken", data.refreshToken);
  localStorage.setItem("user", JSON.stringify(data.user));

  setUser(data.user);
  setAccessToken(data.accessToken);
  setRefreshToken(data.refreshToken);

  // 🔥 REVIEW REDIRECT AFTER LOGIN (ADD HERE)
  try {
    const rawDraft = sessionStorage.getItem("pendingReviewDraft");

    if (rawDraft) {
      const draft = JSON.parse(rawDraft);

      if (draft?.productSlug) {
  window.location.href = `/products/${draft.productSlug}#reviews-section`;
  return;
}

    }
  } catch {
    sessionStorage.removeItem("pendingReviewDraft");
  }
};


  // 🔐 REGISTER (UNCHANGED)
  const register = async (regData: any) => {
    const res = await fetch(
      "https://testapi.knowledgemarkg.com/api/Auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regData),
      }
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw {
        errors: errorData?.errors,
        message: errorData?.message || "Registration failed",
      };
    }

    const data = await res.json();

    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("user", JSON.stringify(data.user));

    setUser(data.user);
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
  };

  // 🚪 LOGOUT (SAFE)
  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("guestEmail");

    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
  };

  return (
   <AuthContext.Provider
  value={{
    user,
    accessToken,
    refreshToken,
    login,
    register,
    logout,
    isAuthenticated: !!accessToken,
    profileLoading,
     refreshProfile: fetchProfile, // ✅ ADD THIS
  }}
>

      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext)!;
