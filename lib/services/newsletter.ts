// lib/services/newsletter.ts

import axios, { AxiosResponse } from 'axios';
import { API_BASE_URL } from '@/lib/api-config';

const API_URL = `${API_BASE_URL}/api/Newsletter`;

export interface NewsletterSubscription {
  id: string;
  email: string;
  isActive: boolean;
  subscribedAt: string;
  source: string;
  createdAt: string;
}

export interface NewsletterStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  inactiveSubscriptions: number;
}

export interface NewsletterResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

class NewsletterService {
  // Get all subscriptions with pagination and filters
  async getSubscriptions(params?: {
    page?: number;
    pageSize?: number;
    isActive?: boolean;
    searchEmail?: string;
  }): Promise<AxiosResponse<NewsletterResponse<PaginatedResponse<NewsletterSubscription>>>> {
    return axios.get(`${API_URL}/subscriptions`, { params });
  }

  // Subscribe a user (or reactivate inactive user)
  async subscribe(email: string): Promise<AxiosResponse<NewsletterResponse<boolean>>> {
    return axios.post(`${API_URL}/subscribe`, { email });
  }

  // Unsubscribe a user
  async unsubscribe(email: string): Promise<AxiosResponse<NewsletterResponse<boolean>>> {
    return axios.post(`${API_URL}/unsubscribe`, { email });
  }

  // Get newsletter statistics
  async getStats(): Promise<AxiosResponse<NewsletterResponse<NewsletterStats>>> {
    return axios.get(`${API_URL}/stats`);
  }
}

export const newsletterService = new NewsletterService();
