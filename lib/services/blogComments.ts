import { apiClient } from '../api';
import { API_ENDPOINTS } from '../api-config';

// --- BlogComment Interfaces ---
export interface BlogComment {
  id: string;
  commentText: string;
  authorName: string;
  authorEmail: string;
  userId?: string;
  isApproved: boolean;
  approvedAt?: string | null;
  approvedBy?: string | null;
  parentCommentId?: string | null;
  replies?: string[];
  blogPostId: string;
  blogPostTitle?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  authorIpAddress?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: string[] | null;
}

export interface BlogCommentStats {
  total: number;
  pending: number;
  approved: number;
  spam: number;
}

// --- Main Service ---
export const blogCommentsService = {
  // Get all comments for a specific post (with includeUnapproved param)
  getByPostId: (postId: string, includeUnapproved: boolean = true, config: any = {}) =>
    apiClient.get<ApiResponse<BlogComment[]>>(
      `${API_ENDPOINTS.blogComments}/post/${postId}?includeUnapproved=${includeUnapproved}`,
      config
    ),

  // Get comment by ID
  getById: (id: string, config: any = {}) =>
    apiClient.get<BlogComment>(`${API_ENDPOINTS.blogComments}/${id}`, config),

  // Approve comment
  approve: (id: string, config: any = {}) =>
    apiClient.post<ApiResponse<BlogComment>>(
      `${API_ENDPOINTS.blogComments}/${id}/approve`,
      {},
      config
    ),

  // Mark comment as spam (if backend supports)
  markAsSpam: (id: string, config: any = {}) =>
    apiClient.post<ApiResponse<BlogComment>>(
      `${API_ENDPOINTS.blogComments}/${id}/spam`,
      {},
      config
    ),

  // Delete comment by ID
  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`${API_ENDPOINTS.blogComments}/${id}`),

  // Get all blog posts (for filter dropdown)
  getAllPosts: (config: any = {}) =>
    apiClient.get<ApiResponse<BlogPost[]>>('/api/BlogPosts', config),
};
