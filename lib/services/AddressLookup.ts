import { apiClient, ApiResponse } from "@/lib/api";

// =============================
// TYPES
// =============================

export interface AddressSuggestion {
  id: string;
  type: string;
  text: string;
  highlight?: string;
  description?: string;
}

export interface AddressSearchApiResponse {
  success: boolean;
  message: string;
  data: AddressSuggestion[];
}

export interface AddressDetails {
  formattedAddress: string[];
  line1: string;
  line2: string;
  line3: string;
  line4: string;
  locality: string;
  townOrCity: string;
  county: string;
  district: string;
  thoroughfare: string;
  buildingName: string;
  subBuildingName: string;
  subBuildingNumber: string;
  buildingNumber: string;
  postalCode: string;
  country: string;
  countryIso2: string;
  countryIso3: string;
  latitude: string;
  longitude: string;
  city: string;
  province: string;
}

export interface AddressDetailsApiResponse {
  success: boolean;
  message: string;
  data: AddressDetails;
}

export interface Country {
  name: string;
  iso2: string;
  iso3: string;
  flag: string;
}

export interface CountriesApiResponse {
  success: boolean;
  message: string;
  data: Country[];
}

// =============================
// ENDPOINTS
// =============================

const BASE = "/api/address-lookup";

const ENDPOINTS = {
  search: `${BASE}/search`,
  details: (id: string) => `${BASE}/details/${id}`,
  countries: `${BASE}/countries`,
};

// =============================
// SERVICE
// =============================

export const addressLookupService = {
  // 🔎 SEARCH
  async search(query: string, country: string = "GB") {
    if (!query || query.trim().length < 3) {
      return [];
    }

    const response: ApiResponse<AddressSearchApiResponse> =
      await apiClient.get<AddressSearchApiResponse>(ENDPOINTS.search, {
        params: { query: query.trim(), country },
      });

    // ✅ HANDLE ERROR FROM WRAPPER
    if (response.error) {
      throw new Error(response.error);
    }

    if (!response.data?.data) {
      return [];
    }

    return response.data.data;
  },

  // 📦 DETAILS
  async getDetails(id: string) {
    if (!id) {
      throw new Error("Address ID is required");
    }

    const response: ApiResponse<AddressDetailsApiResponse> =
      await apiClient.get<AddressDetailsApiResponse>(
        ENDPOINTS.details(id)
      );

    if (response.error) {
      throw new Error(response.error);
    }

    if (!response.data?.data) {
      throw new Error("Address details not found");
    }

    return response.data.data;
  },

  // 🌍 COUNTRIES
  async getCountries() {
    const response: ApiResponse<CountriesApiResponse> =
      await apiClient.get<CountriesApiResponse>(
        ENDPOINTS.countries
      );

    if (response.error) {
      throw new Error(response.error);
    }

    if (!response.data?.data) {
      return [];
    }

    return response.data.data;
  },
};