// lib/services/blogComments.ts

import { apiClient } from '../api';
import { API_ENDPOINTS } from '../api-config';

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

export const blogCommentsService = {
  /**
   * Get all comments for a specific post
   */
  getByPostId: (postId: string, includeUnapproved: boolean = true, config: any = {}) =>
    apiClient.get<ApiResponse<BlogComment[]>>(
      `${API_ENDPOINTS.blogComments}/post/${postId}?includeUnapproved=${includeUnapproved}`,
      config
    ),

  /**
   * Get all spam comments
   */
  getSpamComments: (config: any = {}) =>
    apiClient.get<ApiResponse<BlogComment[]>>(
      `${API_ENDPOINTS.blogComments}/spam`,
      config
    ),

  /**
   * Get comment by ID
   */
  getById: (id: string, config: any = {}) =>
    apiClient.get<BlogComment>(`${API_ENDPOINTS.blogComments}/${id}`, config),

  /**
   * Approve comment
   */
  approve: (id: string, config: any = {}) =>
    apiClient.post<ApiResponse<BlogComment>>(
      `${API_ENDPOINTS.blogComments}/${id}/approve`,
      {},
      config
    ),

  /**
   * ✅ FIXED: Flag comment as spam - Using QUERY PARAMETERS (backend expects this)
   */
  flagAsSpam: (
    id: string, 
    reason: string, 
    spamScore: number, 
    flaggedBy: string, 
    config: any = {}
  ) => {
    // ✅ Build query parameters (backend currently uses query params)
    const params = new URLSearchParams({
      reason: reason,
      spamScore: spamScore.toString(),
      flaggedBy: flaggedBy
    });

    console.log("🚩 Flagging comment as spam:", {
      commentId: id,
      endpoint: `${API_ENDPOINTS.blogComments}/${id}/flag-spam?${params.toString()}`,
      params: {
        reason,
        spamScore,
        flaggedBy
      }
    });

    return apiClient.post<ApiResponse<BlogComment>>(
      `${API_ENDPOINTS.blogComments}/${id}/flag-spam?${params.toString()}`,
      {}, // ✅ Empty body since backend uses query params
      config
    );
  },

  /**
   * Unflag spam (restore comment)
   */
  unflagSpam: (id: string, config: any = {}) => {
    console.log("✅ Unflagging spam comment:", id);
    
    return apiClient.post<ApiResponse<BlogComment>>(
      `${API_ENDPOINTS.blogComments}/${id}/unflag-spam`,
      {},
      config
    );
  },

  /**
   * Reply to comment
   */
  replyToComment: (commentId: string, data: any, config: any = {}) => {
    console.log("📤 Replying to comment:", commentId);
    
    return apiClient.post<ApiResponse<BlogComment>>(
      `${API_ENDPOINTS.blogComments}/${commentId}/reply`,
      data,
      config
    );
  },

  /**
   * Delete comment by ID
   */
  delete: (id: string, config: any = {}) => {
    console.log("🗑️ Deleting comment:", id);
    
    return apiClient.delete<ApiResponse<null>>(
      `${API_ENDPOINTS.blogComments}/${id}`, 
      config
    );
  },

  /**
   * Get all blog posts WITH comments
   */
  getAllPosts: (config: any = {}) => {
    console.log("📡 Fetching all blog posts with comments");
    
    return apiClient.get<ApiResponse<BlogPost[]>>(
      '/api/BlogPosts?includeUnpublished=true&includeDeleted=false&includeComments=true', 
      config
    );
  },
};

export default blogCommentsService;
