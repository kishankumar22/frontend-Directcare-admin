import { apiClient } from "./api";
import { API_ENDPOINTS } from "./api-config";

// --- PharmacyQuestion TypeScript Interfaces ---
export interface PharmacyQuestionOption {
  id: string;
  pharmacyQuestionId: string;
  optionText: string;
  isDisqualifying: boolean;
  displayOrder: number;
}

export interface PharmacyQuestion {
  id: string;
  questionText: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt?: string;
  options: PharmacyQuestionOption[];
}

export interface PharmacyQuestionApiResponse {
  success: boolean;
  message?: string;
  data: PharmacyQuestion[];
  errors?: string[];
}

export interface SinglePharmacyQuestionApiResponse {
  success: boolean;
  message?: string;
  data: PharmacyQuestion;
  errors?: string[];
}

export interface CreatePharmacyQuestionDto {
  questionText: string;
  isActive: boolean;
  displayOrder: number;
  options: {
    optionText: string;
    isDisqualifying: boolean;
    displayOrder: number;
  }[];
}

export interface UpdatePharmacyQuestionDto {
  id: string;
  command?: string; // ✅ Add optional command field
  questionText: string;
  isActive: boolean;
  displayOrder: number;
  options: {
    id: string;
    optionText: string;
    isDisqualifying: boolean;
    displayOrder: number;
  }[];
}


export interface DeletePharmacyQuestionApiResponse {
  success: boolean;
  message?: string;
  data: boolean;
  errors?: string[];
}

export interface RestorePharmacyQuestionApiResponse {
  success: boolean;
  message?: string;
  data: boolean;
  errors?: string[];
}

// --- Main PharmacyQuestions Service ---
export const pharmacyQuestionsService = {
  // Get all pharmacy questions (with optional config: params/headers)
  getAll: (config: any = {}) =>
    apiClient.get<PharmacyQuestionApiResponse>(API_ENDPOINTS.PharmacyQuestions, config),

  // Get single pharmacy question by ID
  getById: (id: string, config: any = {}) =>
    apiClient.get<SinglePharmacyQuestionApiResponse>(
      `${API_ENDPOINTS.PharmacyQuestions}/${id}`,
      config
    ),

  // Create new pharmacy question
  create: (data: CreatePharmacyQuestionDto, config: any = {}) =>
    apiClient.post<PharmacyQuestionApiResponse>(
      API_ENDPOINTS.PharmacyQuestions,
      data,
      config
    ),

  // Update pharmacy question by ID
  update: (id: string, data: UpdatePharmacyQuestionDto, config: any = {}) =>
    apiClient.put<PharmacyQuestion>(
      `${API_ENDPOINTS.PharmacyQuestions}/${id}`,
      data,
      config
    ),

  // Delete pharmacy question by ID (soft delete)
  delete: (id: string, config: any = {}) =>
    apiClient.delete<DeletePharmacyQuestionApiResponse>(
      `${API_ENDPOINTS.PharmacyQuestions}/${id}`,
      config
    ),

  // Restore deleted pharmacy question by ID
  restore: (id: string, config: any = {}) =>
    apiClient.post<RestorePharmacyQuestionApiResponse>(
      `${API_ENDPOINTS.PharmacyQuestions}/${id}/restore`,
      {},
      config
    ),
};
