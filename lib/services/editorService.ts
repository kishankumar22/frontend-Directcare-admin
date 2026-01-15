// services/editorService.ts

import { API_ENDPOINTS } from '@/lib/api-config';
import { apiClient } from '../api';

// ✅ Image validation constants
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB in bytes
const ALLOWED_FORMATS = ['image/webp'];
const ALLOWED_EXTENSIONS = ['.webp'];

export interface UploadImageResponse {
  location: string;
  fileName: string;
}

export interface DeleteImageResponse {
  message: string;
}

export interface ImageValidationError {
  isValid: false;
  error: string;
}

export interface ImageValidationSuccess {
  isValid: true;
}

export type ImageValidationResult = ImageValidationError | ImageValidationSuccess;

/**
 * ✅ Validate image before upload
 */
export const validateImage = (file: File): ImageValidationResult => {
  // Check file type
  if (!ALLOWED_FORMATS.includes(file.type)) {
    return {
      isValid: false,
      error: `❌ Invalid file format!\n\nOnly WebP images are supported.\n\nYour file: ${file.type || 'Unknown'}\n\nPlease convert your image to WebP format.`
    };
  }

  // Check file extension
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
    return {
      isValid: false,
      error: `❌ Invalid file extension!\n\nOnly .webp files are allowed.\n\nYour file: ${file.name}\n\nPlease use WebP format.`
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      isValid: false,
      error: `❌ File size too large!\n\nMaximum allowed: 1 MB\nYour file size: ${fileSizeMB} MB\n\nPlease compress your image or choose a smaller file.`
    };
  }

  return { isValid: true };
};

/**
 * ✅ Upload image to server using API Client
 */
export const uploadEditorImage = async (file: File): Promise<UploadImageResponse> => {
  try {
    // Validate image first
    const validation = validateImage(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const formData = new FormData();
    formData.append('file', file, file.name);

    // ✅ Using API Client with proper type handling
    const response = await apiClient.post<UploadImageResponse>(
      API_ENDPOINTS.editor.uploadImage,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      }
    );

    // ✅ Check if response.data exists
    if (!response.data) {
      throw new Error('Upload failed: No data received from server');
    }

    return response.data;
  } catch (error: any) {
    if (error.message && error.message.includes('❌')) {
      // Re-throw validation errors as-is
      throw error;
    }
    
    if (error.response) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Upload failed: ${message}`);
    }
    
    throw new Error('Failed to upload image. Please try again.');
  }
};

/**
 * ✅ Delete image from server by filename using API Client
 */
export const deleteEditorImage = async (fileName: string): Promise<DeleteImageResponse> => {
  try {
    // ✅ Using API Client with proper type handling
    const response = await apiClient.delete<DeleteImageResponse>(
      API_ENDPOINTS.editor.deleteImage,
      {
        params: { fileName }
      }
    );

    // ✅ Check if response.data exists
    if (!response.data) {
      throw new Error('Delete failed: No data received from server');
    }

    return response.data;
  } catch (error: any) {
    if (error.response) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Delete failed: ${message}`);
    }
    
    throw new Error('Failed to delete image. Please try again.');
  }
};

/**
 * ✅ Delete image by URL (alternative endpoint) using API Client
 */
export const deleteEditorImageByUrl = async (url: string): Promise<DeleteImageResponse> => {
  try {
    // ✅ Using API Client with proper type handling
    const response = await apiClient.post<DeleteImageResponse>(
      API_ENDPOINTS.editor.deleteImageByUrl,
      { url }
    );

    // ✅ Check if response.data exists
    if (!response.data) {
      throw new Error('Delete failed: No data received from server');
    }

    return response.data;
  } catch (error: any) {
    if (error.response) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Delete failed: ${message}`);
    }
    
    throw new Error('Failed to delete image. Please try again.');
  }
};

/**
 * ✅ Extract filename from full URL
 */
export const extractFileName = (imageUrl: string): string | null => {
  try {
    const urlParts = imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    return fileName || null;
  } catch (error) {
    console.error('Failed to extract filename:', error);
    return null;
  }
};

/**
 * ✅ Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};
