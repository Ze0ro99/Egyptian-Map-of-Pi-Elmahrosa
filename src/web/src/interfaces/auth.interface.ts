/**
 * @fileoverview Defines TypeScript interfaces and types for authentication-related 
 * data structures in the Egyptian Map of Pi frontend application. Implements secure 
 * interfaces for Pi Network authentication with enhanced token management and 
 * role-based access control.
 */

import { BaseEntity } from '../../backend/shared/interfaces/base.interface';

/**
 * Enumeration of possible KYC (Know Your Customer) verification statuses
 * Tracks the complete lifecycle of user verification process
 */
export enum KYCStatus {
  PENDING = 'PENDING',           // Initial state when KYC is submitted
  IN_PROGRESS = 'IN_PROGRESS',   // KYC verification is being processed
  VERIFIED = 'VERIFIED',         // KYC verification successful
  REJECTED = 'REJECTED',         // KYC verification failed
  EXPIRED = 'EXPIRED',          // KYC verification has expired
  SUSPENDED = 'SUSPENDED'        // KYC verification temporarily suspended
}

/**
 * Enumeration defining security levels for user accounts
 * Used for implementing graduated security measures
 */
export enum SecurityLevel {
  BASIC = 'BASIC',           // Basic security features enabled
  ENHANCED = 'ENHANCED',     // Additional security measures active
  MAXIMUM = 'MAXIMUM'        // Maximum security protocols enforced
}

/**
 * Interface representing an authenticated user with enhanced security features
 * Extends BaseEntity to inherit standard tracking properties
 */
export interface AuthUser extends BaseEntity {
  /**
   * Unique Pi Network identifier for the user
   */
  piId: string;

  /**
   * Current valid access token for API requests
   */
  accessToken: string;

  /**
   * Refresh token for obtaining new access tokens
   */
  refreshToken: string;

  /**
   * Current KYC verification status
   */
  kycStatus: KYCStatus;

  /**
   * Flag indicating if user has merchant privileges
   */
  isMerchant: boolean;

  /**
   * Timestamp of user's last successful login
   */
  lastLogin: Date;

  /**
   * Current security level classification
   */
  securityLevel: SecurityLevel;

  /**
   * Flag indicating if the account is currently active
   */
  isActive: boolean;

  /**
   * Array of assigned user roles for RBAC
   */
  roles: string[];

  /**
   * Unique identifier for the user's current device
   * Used for multi-device security management
   */
  deviceId: string;
}

/**
 * Interface for authentication tokens with enhanced security metadata
 * Used for managing token lifecycle and security state
 */
export interface AuthTokens {
  /**
   * JWT access token for API authentication
   */
  accessToken: string;

  /**
   * JWT refresh token for obtaining new access tokens
   */
  refreshToken: string;

  /**
   * Token expiration time in seconds
   */
  expiresIn: number;

  /**
   * Type of authentication token (e.g., 'Bearer')
   */
  tokenType: string;

  /**
   * Timestamp when the token was issued
   */
  issuedAt: Date;

  /**
   * Token scope defining allowed operations
   */
  scope: string;

  /**
   * Flag indicating if the token is currently valid
   */
  isValid: boolean;
}

/**
 * Type guard to check if a value is a valid KYCStatus
 */
export function isKYCStatus(value: any): value is KYCStatus {
  return Object.values(KYCStatus).includes(value as KYCStatus);
}

/**
 * Type guard to check if a value is a valid SecurityLevel
 */
export function isSecurityLevel(value: any): value is SecurityLevel {
  return Object.values(SecurityLevel).includes(value as SecurityLevel);
}

/**
 * Type for representing token expiration status
 */
export type TokenStatus = {
  isExpired: boolean;
  expiresIn: number;
  warningThreshold: number;
};

/**
 * Type for authentication error states
 */
export type AuthError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};