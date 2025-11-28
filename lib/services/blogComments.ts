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
  isSpam?: boolean;
  spamScore?: number;
  spamReason?: string;
  flaggedAt?: string;
  flaggedBy?: string;
  parentCommentId?: string | null;
  replies?: BlogComment[];
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
  isDeleted?: boolean;
  comments?: BlogComment[];
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

export interface ReplyCommentDto {
  parentCommentId: string;
  commentText: string;
  authorName: string;
  userId?: string;
}

// --- Main Service ---
export const blogCommentsService = {
  // Get all comments for a specific post
  getByPostId: (postId: string, includeUnapproved: boolean = true, config: any = {}) =>
    apiClient.get<ApiResponse<BlogComment[]>>(
      `${API_ENDPOINTS.blogComments}/post/${postId}?includeUnapproved=${includeUnapproved}`,
      config
    ),

  // Get all spam comments
  getSpamComments: (config: any = {}) =>
    apiClient.get<ApiResponse<BlogComment[]>>(
      `${API_ENDPOINTS.blogComments}/spam`,
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

  // Flag comment as spam
  flagAsSpam: (id: string, reason?: string, spamScore?: number, config: any = {}) =>
    apiClient.post<ApiResponse<BlogComment>>(
      `${API_ENDPOINTS.blogComments}/${id}/flag-spam`,
      { reason, spamScore },
      config
    ),

  // Unflag spam (restore comment)
  unflagSpam: (id: string, config: any = {}) =>
    apiClient.post<ApiResponse<BlogComment>>(
      `${API_ENDPOINTS.blogComments}/${id}/unflag-spam`,
      {},
      config
    ),

  // Reply to comment
  replyToComment: (commentId: string, data: ReplyCommentDto, config: any = {}) =>
    apiClient.post<ApiResponse<BlogComment>>(
      `${API_ENDPOINTS.blogComments}/${commentId}/reply`,
      data,
      config
    ),

  // ✅ Delete comment by ID (Fixed return type)
  delete: (id: string, config: any = {}) =>
    apiClient.delete<ApiResponse<null>>(`${API_ENDPOINTS.blogComments}/${id}`, config),

  // Get all blog posts WITH comments
  getAllPosts: (config: any = {}) =>
    apiClient.get<ApiResponse<BlogPost[]>>('/api/BlogPosts', config),
};
