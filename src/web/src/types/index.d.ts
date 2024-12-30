// @version 1.0.0
// Core TypeScript declarations for Egyptian Map of Pi web application
// Dependencies:
// - jsonwebtoken: ^9.0.0

import { Environment } from './environment';
import { JwtPayload } from 'jsonwebtoken';

// Augment Window interface to include Pi Network SDK
declare global {
  interface Window extends globalThis {
    piNetwork: PiNetworkSDK;
  }
}

// ======= Core Type Definitions =======

/**
 * Supported language codes for the application
 * ar: Arabic (primary)
 * en: English (secondary)
 */
export type Language = 'ar' | 'en';

/**
 * Available theme options for the application
 * Supports light and dark modes with Egyptian-specific styling
 */
export type Theme = 'light' | 'dark';

/**
 * Enhanced geographic coordinates type with Egyptian location context
 * Includes additional fields for Egyptian administrative divisions
 */
export type Coordinates = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  governorate?: string; // Egyptian governorate name
  city?: string; // Egyptian city name
};

/**
 * System-wide error code categories
 * @see Technical Specifications section 9.5
 */
export type ErrorCode = 1000 | 2000 | 3000 | 4000 | 5000 | 6000 | 7000 | 8000;

// ======= Core Interfaces =======

/**
 * Pi Network SDK interface for browser integration
 * Provides methods for authentication and payment processing
 */
export interface PiNetworkSDK {
  authenticate(): Promise<AuthResponse>;
  createPayment(payment: PaymentData): Promise<PaymentResult>;
  openPaymentDialog(txid: string): Promise<void>;
}

/**
 * Pi Network authentication response interface
 * Contains user authentication data and profile information
 */
export interface AuthResponse {
  accessToken: string;
  user: UserProfile;
}

/**
 * User profile interface containing Pi Network user data
 */
export interface UserProfile {
  uid: string;
  username: string;
  roles: string[];
  kyc_status: 'none' | 'pending' | 'verified';
  created_at: string;
}

/**
 * Pi payment transaction data interface
 */
export interface PaymentData {
  amount: number;
  memo: string;
  metadata: string;
}

/**
 * Pi payment transaction result interface
 */
export interface PaymentResult {
  txid: string;
  status: 'pending' | 'completed' | 'failed';
}

/**
 * Generic API response interface with type parameter
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  errors?: ValidationError[];
}

/**
 * Detailed validation error interface
 */
export interface ValidationError {
  field: string;
  message: string;
  code: ErrorCode;
}

/**
 * Interface for paginated API responses
 * Extends ApiResponse with pagination metadata
 */
export interface PaginatedResponse<T = any> extends ApiResponse<T> {
  page: number;
  limit: number;
  total: number;
  items: T[];
}

/**
 * Location-based search parameters interface
 */
export interface LocationSearchParams {
  coordinates: Coordinates;
  radius: number; // Search radius in kilometers
  category?: string;
  sortBy?: 'distance' | 'price' | 'rating';
}

/**
 * Multilingual content interface for Arabic and English text
 */
export interface MultilingualContent {
  ar: string; // Arabic content (primary)
  en: string; // English content (secondary)
}

/**
 * Interface for RTL/LTR direction context
 */
export interface DirectionContext {
  direction: 'rtl' | 'ltr';
  textAlign: 'right' | 'left';
}

// ======= Type Guards =======

/**
 * Type guard for validating API responses
 */
export function isApiResponse<T>(response: any): response is ApiResponse<T> {
  return 'success' in response && 'message' in response && 'data' in response;
}

/**
 * Type guard for validating paginated responses
 */
export function isPaginatedResponse<T>(response: any): response is PaginatedResponse<T> {
  return isApiResponse(response) && 'page' in response && 'total' in response && 'items' in response;
}

// Ensure this file is treated as a module
export {};