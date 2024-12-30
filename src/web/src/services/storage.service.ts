/**
 * @fileoverview Enhanced storage service for managing file uploads and storage operations
 * in the Egyptian Map of Pi web application. Optimized for Egyptian network conditions,
 * mobile-first approach, and Arabic content support.
 * @version 1.0.0
 */

import axios, { AxiosRequestConfig } from 'axios'; // v1.5.0
import imageCompression from 'browser-image-compression'; // v2.0.0
import { Listing } from '../interfaces/listing.interface';
import { setLocalStorage } from '../utils/storage.util';

// Constants for file handling and optimization
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit for mobile optimization
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds base delay
const COMPRESSION_QUALITY = 0.8;
const MAX_IMAGE_DIMENSION = 1920;

/**
 * Enhanced service class for managing file storage operations with Egyptian market optimizations
 */
export class StorageService {
  private baseUrl: string;
  private cdnUrl: string;
  private maxFileSize: number;
  private maxRetries: number;
  private retryDelay: number;
  private compressionOptions: any;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_STORAGE_API_URL || '';
    this.cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || '';
    this.maxFileSize = MAX_FILE_SIZE;
    this.maxRetries = MAX_RETRIES;
    this.retryDelay = RETRY_DELAY;
    this.compressionOptions = {
      maxSizeMB: 1,
      maxWidthOrHeight: MAX_IMAGE_DIMENSION,
      useWebWorker: true,
      fileType: 'image/jpeg',
      quality: COMPRESSION_QUALITY
    };
  }

  /**
   * Validates file type and size with Arabic error messages
   * @param file - File to validate
   * @throws Error with Arabic message if validation fails
   */
  private validateFile(file: File): void {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error('نوع الملف غير مدعوم. يرجى استخدام JPEG أو PNG أو WebP');
    }

    if (file.size > this.maxFileSize) {
      throw new Error('حجم الملف كبير جدًا. الحد الأقصى هو 5 ميجابايت');
    }
  }

  /**
   * Sanitizes Arabic filename characters for safe storage
   * @param filename - Original filename
   * @returns Sanitized filename
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^\u0621-\u064Aa-zA-Z0-9.-]/g, '_')
      .replace(/\s+/g, '_')
      .toLowerCase();
  }

  /**
   * Implements exponential backoff for retrying failed uploads
   * @param retryCount - Current retry attempt number
   * @returns Delay in milliseconds
   */
  private getRetryDelay(retryCount: number): number {
    return Math.min(this.retryDelay * Math.pow(2, retryCount), 10000);
  }

  /**
   * Uploads an image file with mobile optimization and connection resilience
   * @param file - File to upload
   * @param path - Storage path
   * @param compress - Whether to compress the image
   * @returns Promise resolving to CDN URL of uploaded image
   */
  public async uploadImage(file: File, path: string, compress: boolean = true): Promise<string> {
    try {
      this.validateFile(file);
      const sanitizedFilename = this.sanitizeFilename(file.name);
      
      let processedFile = file;
      if (compress) {
        processedFile = await imageCompression(file, this.compressionOptions);
      }

      const formData = new FormData();
      formData.append('file', processedFile, sanitizedFilename);
      formData.append('path', path);

      let retryCount = 0;
      const uploadWithRetry = async (): Promise<string> => {
        try {
          const config: AxiosRequestConfig = {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setLocalStorage(`upload_progress_${sanitizedFilename}`, progress);
            }
          };

          const response = await axios.post(`${this.baseUrl}/upload`, formData, config);
          return `${this.cdnUrl}/${response.data.path}`;
        } catch (error) {
          if (retryCount < this.maxRetries) {
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, this.getRetryDelay(retryCount)));
            return uploadWithRetry();
          }
          throw new Error('فشل تحميل الملف. يرجى المحاولة مرة أخرى');
        }
      };

      return await uploadWithRetry();
    } catch (error) {
      throw new Error(`خطأ في تحميل الصورة: ${error.message}`);
    }
  }

  /**
   * Deletes an image with enhanced error handling
   * @param imageUrl - URL of image to delete
   */
  public async deleteImage(imageUrl: string): Promise<void> {
    try {
      if (!imageUrl.startsWith(this.cdnUrl)) {
        throw new Error('عنوان URL غير صالح للصورة');
      }

      const path = imageUrl.replace(this.cdnUrl, '');
      let retryCount = 0;

      const deleteWithRetry = async (): Promise<void> => {
        try {
          await axios.delete(`${this.baseUrl}/delete`, {
            data: { path }
          });
        } catch (error) {
          if (retryCount < this.maxRetries) {
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, this.getRetryDelay(retryCount)));
            return deleteWithRetry();
          }
          throw new Error('فشل حذف الملف. يرجى المحاولة مرة أخرى');
        }
      };

      await deleteWithRetry();
    } catch (error) {
      throw new Error(`خطأ في حذف الصورة: ${error.message}`);
    }
  }

  /**
   * Retrieves upload progress with enhanced tracking
   * @param fileId - Identifier for the file
   * @returns Upload progress percentage
   */
  public getUploadProgress(fileId: string): number {
    try {
      const progress = localStorage.getItem(`upload_progress_${fileId}`);
      return progress ? parseInt(progress, 10) : 0;
    } catch (error) {
      return 0;
    }
  }
}

export default new StorageService();