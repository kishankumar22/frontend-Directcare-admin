import { apiClient } from "../api";
import { API_ENDPOINTS } from "../api-config";

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
  answerType: string;
  createdAt: string;
  createdBy?: string;
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
  answerType: string;
  options: {
    optionText: string;
    isDisqualifying: boolean;
    displayOrder: number;
  }[];
}

export interface UpdatePharmacyQuestionDto {
  id: string;
  command?: string;
  questionText: string;
  isActive: boolean;
  displayOrder: number;
  answerType: string;
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

// --- Product Pharmacy Question Interfaces ---
export interface ProductPharmacyQuestionDto {
  id: string;
  productId: string;
  pharmacyQuestionId: string;
  questionText: string;
  answerType: string;
  isRequired: boolean;
  displayOrder: number;
  options: PharmacyQuestionOption[];
}

export interface AssignProductPharmacyQuestionDto {
  pharmacyQuestionId: string;
  answerType: string;
  isRequired: boolean;
  displayOrder: number;
}

export interface ProductPharmacyQuestionsApiResponse {
  success: boolean;
  message?: string;
  data: ProductPharmacyQuestionDto[];
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

  // Get pharmacy questions assigned to a product
  getProductQuestions: (productId: string, config: any = {}) =>
    apiClient.get<ProductPharmacyQuestionsApiResponse>(
      `${API_ENDPOINTS.products}/${productId}/pharmacy-questions`,
      config
    ),

  // Assign pharmacy questions to a product
  assignProductQuestions: (
    productId: string,
    data: { questions: AssignProductPharmacyQuestionDto[] },
    config: any = {}
  ) =>
    apiClient.post<ProductPharmacyQuestionsApiResponse>(
      `${API_ENDPOINTS.products}/${productId}/pharmacy-questions`,
      data,
      config
    ),
};
