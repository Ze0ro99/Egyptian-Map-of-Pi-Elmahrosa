/**
 * @fileoverview Response utility module for standardized API response formatting
 * @version 1.0.0
 * 
 * Provides consistent response formatting across all Egyptian Map of Pi backend services
 * with support for Arabic localization and Egyptian market requirements.
 */

import dayjs from 'dayjs'; // v1.11.0
import timezone from 'dayjs/plugin/timezone'; // v1.11.0
import { 
  ApiResponse, 
  ErrorResponse, 
  SuccessResponse, 
  ErrorApiResponse, 
  PaginationMetadata 
} from '../interfaces/response.interface';
import { ErrorCodes } from '../constants/error-codes';
import { logger } from './logger.util';

// Configure dayjs for Egyptian timezone
dayjs.extend(timezone);
dayjs.tz.setDefault('Africa/Cairo');

/**
 * Language codes supported by the platform
 */
type SupportedLanguage = 'ar' | 'en';

/**
 * Creates a standardized success response with proper localization
 * 
 * @param data - Response payload data
 * @param pagination - Optional pagination metadata
 * @param language - Response language (ar/en)
 * @returns Formatted success response
 */
export function createSuccessResponse<T>(
  data: T,
  pagination: PaginationMetadata | null = null,
  language: SupportedLanguage = 'ar'
): SuccessResponse<T> {
  // Format currency values for Egyptian market
  const formattedData = formatCurrencyValues(data);

  const response: SuccessResponse<T> = {
    success: true,
    data: formattedData,
    error: null,
    pagination,
    timestamp: dayjs().tz().format(),
    dir: language === 'ar' ? 'rtl' : 'ltr'
  };

  return response;
}

/**
 * Creates a standardized error response with bilingual support
 * 
 * @param code - Error code from ErrorCodes enum
 * @param messageKey - Error message key for localization
 * @param details - Additional error details
 * @param requestId - Unique request identifier
 * @param language - Response language (ar/en)
 * @returns Formatted error response
 */
export function createErrorResponse(
  code: ErrorCodes,
  messageKey: string,
  details: string[] = [],
  requestId: string,
  language: SupportedLanguage = 'ar'
): ErrorApiResponse {
  // Log detailed error information
  logger.error('API Error', {
    code,
    messageKey,
    details,
    requestId
  });

  const errorResponse: ErrorResponse = {
    code,
    message: getLocalizedErrorMessage(messageKey, language),
    details: details.map(detail => localizeErrorDetail(detail, language)),
    timestamp: dayjs().tz().format(),
    requestId
  };

  const response: ErrorApiResponse = {
    success: false,
    data: null,
    error: errorResponse,
    pagination: null,
    dir: language === 'ar' ? 'rtl' : 'ltr'
  };

  return response;
}

/**
 * Creates a paginated success response with enhanced metadata
 * 
 * @param data - Array of items for the current page
 * @param page - Current page number (1-based)
 * @param limit - Items per page
 * @param totalItems - Total number of items
 * @param language - Response language (ar/en)
 * @returns Paginated success response
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  totalItems: number,
  language: SupportedLanguage = 'ar'
): SuccessResponse<T[]> {
  // Validate pagination parameters
  if (page < 1) page = 1;
  if (limit < 1) limit = 10;

  const totalPages = Math.ceil(totalItems / limit);
  
  const paginationMetadata: PaginationMetadata = {
    page,
    limit,
    totalPages,
    totalItems,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1
  };

  // Add performance metrics
  const metrics = {
    responseTime: process.hrtime(),
    itemCount: data.length
  };

  return createSuccessResponse(
    data,
    paginationMetadata,
    language
  );
}

/**
 * Formats currency values in response data for Egyptian market
 * 
 * @param data - Data containing currency values
 * @returns Formatted data with proper currency representation
 */
function formatCurrencyValues<T>(data: T): T {
  if (!data) return data;

  const formatted = { ...data };
  
  // Recursively format currency values
  Object.entries(formatted).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      formatted[key] = formatCurrencyValues(value);
    } else if (key.toLowerCase().includes('price') || key.toLowerCase().includes('amount')) {
      // Format currency values with Egyptian Pound symbol
      formatted[key] = `${value} EGP`;
    }
  });

  return formatted;
}

/**
 * Gets localized error message based on message key and language
 * 
 * @param messageKey - Error message key
 * @param language - Target language
 * @returns Localized error message
 */
function getLocalizedErrorMessage(messageKey: string, language: SupportedLanguage): string {
  // TODO: Implement message localization lookup
  // This should integrate with a proper i18n system
  return messageKey;
}

/**
 * Localizes error detail message
 * 
 * @param detail - Error detail message
 * @param language - Target language
 * @returns Localized error detail
 */
function localizeErrorDetail(detail: string, language: SupportedLanguage): string {
  // TODO: Implement detail message localization
  // This should integrate with a proper i18n system
  return detail;
}

/**
 * Type guard to check if a value is a supported language code
 * 
 * @param value - Value to check
 * @returns True if value is a supported language code
 */
function isSupportedLanguage(value: string): value is SupportedLanguage {
  return ['ar', 'en'].includes(value);
}