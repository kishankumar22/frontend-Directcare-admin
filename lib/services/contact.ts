import { apiClient } from "../api";
import { API_ENDPOINTS } from "../api-config";

// ================= TYPES =================

export interface FeatureCard {
  icon: string;
  heading: string;
  description: string;
}

export interface DeliveryStrip {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
  pageTitle: string;
  pageSubtitle: string;
  featureCards: FeatureCard[];
  infoSectionTitle: string;
  infoPoints: string[];
  pageContentJson: string;
  currentUser: string;
}

export interface DeliveryStripResponse {
  success: boolean;
  message?: string;
  data: DeliveryStrip;
  errors?: string[];
}

export interface DeliveryStripListResponse {
  success: boolean;
  message?: string;
  data: DeliveryStrip[];
  errors?: string[];
}

export interface DeliveryStripActionResponse {
  success: boolean;
  message?: string;
  data: boolean;
  errors?: string[];
}

// ================= SERVICE =================

export const deliveryStripService = {
  // ✅ CREATE
  create: (data: DeliveryStrip) =>
    apiClient.post<DeliveryStripResponse>(
      API_ENDPOINTS.deliveryStrip,
      data
    ),

  // ✅ UPDATE
  update: (id: string, data: DeliveryStrip) =>
    apiClient.put<DeliveryStripResponse>(
      `${API_ENDPOINTS.deliveryStrip}/${id}`,
      data
    ),

  // ✅ DELETE
  delete: (id: string) =>
    apiClient.delete<DeliveryStripActionResponse>(
      `${API_ENDPOINTS.deliveryStrip}/${id}`
    ),

  // ✅ TOGGLE ACTIVE
  toggle: (id: string) =>
    apiClient.patch<DeliveryStripActionResponse>(
      `${API_ENDPOINTS.deliveryStrip}/${id}/toggle`
    ),
};