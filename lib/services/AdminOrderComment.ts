import { apiClient } from '../api';

export interface AdminComment {
  id: string;
  orderId: string;
  comment: string;
  createdByName: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  isMine: boolean;
}

export interface AdminCommentResponse {
  success: boolean;
  message: string;
  data: AdminComment[];
  errors: string[];
}

export interface SingleAdminCommentResponse {
  success: boolean;
  message: string;
  data: AdminComment;
  errors: string[];
}

export interface DeleteAdminCommentResponse {
  success: boolean;
  message: string;
  data: boolean;
  errors: string[];
}

export const AdminOrderCommentService = {
  /**
   * Get all admin comments for an order
   * GET /api/Orders/{orderId}/admin-comments
   */
  getAdminComments: async (orderId: string): Promise<AdminCommentResponse> => {
    const response = await apiClient.get<AdminCommentResponse>(`/api/Orders/${orderId}/admin-comments`);
    return response.data as AdminCommentResponse;
  },

  /**
   * Create a new admin comment for an order
   * POST /api/Orders/{orderId}/admin-comments
   */
  createAdminComment: async (orderId: string, comment: string): Promise<SingleAdminCommentResponse> => {
    const response = await apiClient.post<SingleAdminCommentResponse>(`/api/Orders/${orderId}/admin-comments`, { comment });
    return response.data as SingleAdminCommentResponse;
  },

  /**
   * Update an existing admin comment
   * PUT /api/Orders/admin-comments/{commentId}
   */
  updateAdminComment: async (commentId: string, comment: string): Promise<SingleAdminCommentResponse> => {
    const response = await apiClient.put<SingleAdminCommentResponse>(`/api/Orders/admin-comments/${commentId}`, { comment });
    return response.data as SingleAdminCommentResponse;
  },

  /**
   * Delete an admin comment
   * DELETE /api/Orders/admin-comments/{commentId}
   */
  deleteAdminComment: async (commentId: string): Promise<DeleteAdminCommentResponse> => {
    const response = await apiClient.delete<DeleteAdminCommentResponse>(`/api/Orders/admin-comments/${commentId}`);
    return response.data as DeleteAdminCommentResponse;
  }
};
