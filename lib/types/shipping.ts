// ==================== SHIPPING ZONE TYPES ====================

export interface ShippingZone {
  id: string;
  name: string;
  description: string;
  country: string;
  isActive: boolean;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface CreateZoneDto {
  name: string;
  description: string;
  country: string;
  isActive: boolean;
  displayOrder: number;
}

export interface UpdateZoneDto {
  name: string;
  description: string;
  country: string;
  isActive: boolean;
  displayOrder: number;
}

// ==================== SHIPPING METHOD TYPES ====================

export interface ShippingMethod {
  id: string;
  name: string;
  displayName: string;
  description: string;
  carrierCode: string;
  serviceCode: string;
  deliveryTimeMinDays: number;
  deliveryTimeMaxDays: number;
  trackingSupported: boolean;
  signatureRequired: boolean;
  isActive: boolean;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface CreateMethodDto {
  name: string;
  displayName: string;
  description: string;
  carrierCode: string;
  serviceCode: string;
  deliveryTimeMinDays: number;
  deliveryTimeMaxDays: number;
  trackingSupported: boolean;
  signatureRequired: boolean;
  isActive: boolean;
  displayOrder: number;
}

export interface UpdateMethodDto {
  name: string;
  displayName: string;
  description: string;
  carrierCode: string;
  serviceCode: string;
  deliveryTimeMinDays: number;
  deliveryTimeMaxDays: number;
  trackingSupported: boolean;
  signatureRequired: boolean;
  isActive: boolean;
  displayOrder: number;
}

// ==================== SHIPPING RATE TYPES ====================

export interface ShippingRate {
  id: string;
  shippingMethodId: string;
  shippingMethodName: string;
  weightFrom: number;
  weightTo: number;
  orderValueFrom: number;
  orderValueTo: number;
  baseRate: number;
  perKgRate: number;
  perItemRate: number;
  minimumCharge: number;
  maximumCharge: number | null;
  freeShippingThreshold: number | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface ZoneRates {
  zoneId: string;
  zoneName: string;
  zoneDescription: string;
  rates: ShippingRate[];
}

export interface CreateRateDto {
  shippingZoneId: string;
  shippingMethodId: string;
  weightFrom: number;
  weightTo: number;
  orderValueFrom: number;
  orderValueTo: number;
  baseRate: number;
  perKgRate: number;
  perItemRate: number;
  minimumCharge: number;
  maximumCharge: number | null;
  freeShippingThreshold: number | null;
  isActive: boolean;
}

export interface UpdateRateDto {
  baseRate: number;
  perKgRate: number;
  perItemRate: number;
  minimumCharge: number;
  maximumCharge: number | null;
  freeShippingThreshold: number | null;
  isActive: boolean;
}

// ==================== API RESPONSE TYPES ====================

export interface ShippingApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: string[] | null;
}

export interface ZoneApiResponse {
  success: boolean;
  message?: string;
  data: ShippingZone[];
  errors?: string[] | null;
}

export interface SingleZoneResponse {
  success: boolean;
  message?: string;
  data: ShippingZone;
  errors?: string[] | null;
}

export interface MethodApiResponse {
  success: boolean;
  message?: string;
  data: ShippingMethod[];
  errors?: string[] | null;
}

export interface SingleMethodResponse {
  success: boolean;
  message?: string;
  data: ShippingMethod;
  errors?: string[] | null;
}

export interface RateApiResponse {
  success: boolean;
  message?: string;
  data: ZoneRates;
  errors?: string[] | null;
}

export interface SingleRateResponse {
  success: boolean;
  message?: string;
  data: string; // Returns rate ID
  errors?: string[] | null;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
  data?: string;
  errors?: string[] | null;
}

// ==================== STATS TYPES ====================

export interface ShippingStats {
  totalZones: number;
  totalMethods: number;
  totalRates: number;
  activeZones: number;
  activeMethods: number;
}
