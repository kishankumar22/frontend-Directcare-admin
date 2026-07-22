import { apiClient } from "../api";
import { API_ENDPOINTS } from "../api-config";

// --- PharmacyQuestion TypeScript Interfaces ---
// Options can each carry a nested follow-up question (itself Multiple Choice or Text),
// to any depth — PharmacyQuestionOption.followUpQuestion is a full PharmacyQuestion.
export interface PharmacyQuestionOption {
  id: string;
  pharmacyQuestionId: string;
  optionText: string;
  displayOrder: number;
  hasFollowUpQuestion?: boolean;
  followUpQuestion?: PharmacyQuestion | null;
}

export interface PharmacyQuestion {
  id: string;
  questionText: string;
  isActive: boolean;
  isDeleted: boolean;
  displayOrder: number;
  answerType: string;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  options: PharmacyQuestionOption[];
  productCount?: number; // only populated by the list endpoint (getAll)
}

// Product a pharmacy question is assigned to — shown in the "Products" count popup
export interface PharmacyQuestionAssignedProduct {
  productId: string;
  productName: string;
  sku?: string | null;
  slug?: string | null;
}

export interface PharmacyQuestionAssignedProductsApiResponse {
  success: boolean;
  message?: string;
  data: PharmacyQuestionAssignedProduct[];
  errors?: string[];
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

export interface CreatePharmacyFollowUpQuestionDto {
  questionText: string;
  isActive: boolean;
  answerType: string;
  options: CreatePharmacyQuestionOptionDto[];
}

export interface CreatePharmacyQuestionOptionDto {
  optionText: string;
  displayOrder: number;
  hasFollowUpQuestion?: boolean;
  followUpQuestion?: CreatePharmacyFollowUpQuestionDto | null;
}

export interface CreatePharmacyQuestionDto {
  questionText: string;
  isActive: boolean;
  displayOrder: number;
  answerType: string;
  options: CreatePharmacyQuestionOptionDto[];
}

export interface UpdatePharmacyFollowUpQuestionDto {
  id?: string; // undefined/null = new follow-up question, else = update existing
  questionText: string;
  isActive: boolean;
  answerType: string;
  options: UpdatePharmacyQuestionOptionDto[];
}

export interface UpdatePharmacyQuestionOptionDto {
  id?: string;
  optionText: string;
  displayOrder: number;
  hasFollowUpQuestion?: boolean;
  followUpQuestion?: UpdatePharmacyFollowUpQuestionDto | null;
}

export interface UpdatePharmacyQuestionDto {
  id: string;
  command?: string;
  questionText: string;
  isActive: boolean;
  displayOrder: number;
  answerType: string;
  options: UpdatePharmacyQuestionOptionDto[];
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
  getAll: (params?: {
    onlyActive?: boolean;
    includeDeleted?: boolean;
  }) =>
    apiClient.get<PharmacyQuestionApiResponse>(
      API_ENDPOINTS.PharmacyQuestions,
      { params }
    ),


  // Get single pharmacy question by ID
  getById: (id: string, config: any = {}) =>
    apiClient.get<SinglePharmacyQuestionApiResponse>(
      `${API_ENDPOINTS.PharmacyQuestions}/${id}`,
      config
    ),

  // Get products this question is assigned to (name + SKU only)
  getAssignedProducts: (id: string, config: any = {}) =>
    apiClient.get<PharmacyQuestionAssignedProductsApiResponse>(
      `${API_ENDPOINTS.PharmacyQuestions}/${id}/products`,
      config
    ),

  // Create new pharmacy question
  create: (data: CreatePharmacyQuestionDto, config: any = {}) =>
  apiClient.post<SinglePharmacyQuestionApiResponse>(
      API_ENDPOINTS.PharmacyQuestions,
      data,
      config
    ),

  // Update pharmacy question by ID
  update: (id: string, data: UpdatePharmacyQuestionDto, config: any = {}) =>
   apiClient.put<SinglePharmacyQuestionApiResponse>(
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
