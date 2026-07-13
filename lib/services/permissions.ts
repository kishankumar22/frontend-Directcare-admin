import { apiClient, type ApiResponse } from '../api';
import { API_ENDPOINTS } from '../api-config';

export interface PermissionPage {
  id: string;
  key: string;
  name: string;
  group: string;
  sortOrder: number;
}

export interface RolePermission {
  pageId: string; 
  key: string;
  name: string;
  group: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface EffectivePermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface UserPermission {
  pageId: string;
  key: string;
  name: string;
  group: string;
  override: Record<string, any>;
  effective: EffectivePermission;
}

export interface MyPermissions {
  [key: string]: EffectivePermission;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: string[];
}

export const permissionsService = {
  getPages: (): Promise<ApiResponse<ApiEnvelope<PermissionPage[]>>> =>
    apiClient.get<ApiEnvelope<PermissionPage[]>>(API_ENDPOINTS.permissions.pages),

  getRolePermissions: (role: string): Promise<ApiResponse<ApiEnvelope<RolePermission[]>>> =>
    apiClient.get<ApiEnvelope<RolePermission[]>>(API_ENDPOINTS.permissions.roles(role)),

  updateRolePermissions: (role: string, body: string[] | any): Promise<ApiResponse<ApiEnvelope<any>>> =>
    apiClient.put<ApiEnvelope<any>>(API_ENDPOINTS.permissions.roles(role), body),

  getUserPermissions: (userId: string): Promise<ApiResponse<ApiEnvelope<UserPermission[]>>> =>
    apiClient.get<ApiEnvelope<UserPermission[]>>(API_ENDPOINTS.permissions.users(userId)),

  updateUserPermissions: (userId: string, body: string[] | any): Promise<ApiResponse<ApiEnvelope<any>>> =>
    apiClient.put<ApiEnvelope<any>>(API_ENDPOINTS.permissions.users(userId), body),

  getMyPermissions: (): Promise<ApiResponse<ApiEnvelope<MyPermissions>>> =>
    apiClient.get<ApiEnvelope<MyPermissions>>(API_ENDPOINTS.permissions.me),
};
