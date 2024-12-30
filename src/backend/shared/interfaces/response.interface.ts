/**
 * @fileoverview Defines standardized response interfaces for the Egyptian Map of Pi platform
 * @version 1.0.0
 * 
 * This file implements comprehensive response interfaces that ensure consistent API
 * responses across all backend services. It provides strong typing, standardized
 * error handling, and support for paginated responses.
 */

import { ErrorCodes } from '../constants/error-codes';
import { BaseEntity } from './base.interface';

/**
 * Generic interface defining the standard structure for all API responses
 * Provides strong typing for the response data and comprehensive error handling
 * 
 * @interface ApiResponse
 * @template T - Type of the response data payload
 */
export interface ApiResponse<T> {
  /** Indicates if the request was successful */
  success: boolean;
  
  /** Strongly typed data payload */
  data: T | null;
  
  /** Error details if the request failed */
  error: ErrorResponse | null;
  
  /** Pagination metadata for list responses */
  pagination: PaginationMetadata | null;
}

/**
 * Comprehensive interface for error responses with detailed tracking information
 * Implements categorized error codes and debugging capabilities
 * 
 * @interface ErrorResponse
 */
export interface ErrorResponse {
  /** Categorized error code from the ErrorCodes enum */
  code: ErrorCodes;
  
  /** Human-readable error message */
  message: string;
  
  /** Additional error details or validation messages */
  details: string[];
  
  /** ISO timestamp when the error occurred */
  timestamp: string;
  
  /** Unique identifier for request tracking */
  requestId: string;
}

/**
 * Interface for pagination metadata in list responses
 * Provides comprehensive pagination information and navigation helpers
 * 
 * @interface PaginationMetadata
 */
export interface PaginationMetadata {
  /** Current page number (1-based) */
  page: number;
  
  /** Number of items per page */
  limit: number;
  
  /** Total number of pages available */
  totalPages: number;
  
  /** Total number of items across all pages */
  totalItems: number;
  
  /** Indicates if there is a next page available */
  hasNextPage: boolean;
  
  /** Indicates if there is a previous page available */
  hasPreviousPage: boolean;
}

/**
 * Strongly typed interface for successful API responses
 * Enforces the success flag as true and requires data payload
 * 
 * @interface SuccessResponse
 * @template T - Type of the response data payload
 * @extends {ApiResponse<T>}
 */
export interface SuccessResponse<T> extends ApiResponse<T> {
  /** Literal true for type safety */
  success: true;
  
  /** Required data payload for successful responses */
  data: T;
  
  /** No error details in successful responses */
  error: null;
}

/**
 * Strongly typed interface for failed API responses
 * Enforces the success flag as false and requires error details
 * 
 * @interface ErrorApiResponse
 * @extends {ApiResponse<null>}
 */
export interface ErrorApiResponse extends ApiResponse<null> {
  /** Literal false for type safety */
  success: false;
  
  /** No data payload in error responses */
  data: null;
  
  /** Required error details for failed responses */
  error: ErrorResponse;
}

/**
 * Type guard to check if a response is a successful response
 * 
 * @param response - API response to check
 * @returns True if the response is a successful response
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is SuccessResponse<T> {
  return response.success === true;
}

/**
 * Type guard to check if a response is an error response
 * 
 * @param response - API response to check
 * @returns True if the response is an error response
 */
export function isErrorResponse<T>(response: ApiResponse<T>): response is ErrorApiResponse {
  return response.success === false;
}