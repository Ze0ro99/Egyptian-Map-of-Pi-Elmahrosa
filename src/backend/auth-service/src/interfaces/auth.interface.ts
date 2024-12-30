/**
 * @fileoverview Defines comprehensive authentication interfaces for the Egyptian Map of Pi auth service
 * @version 1.0.0
 * 
 * This file implements interfaces for Pi Network authentication, session management,
 * token handling, and security-enhanced authentication responses with support for
 * role-based access control and detailed session tracking.
 */

import { BaseEntity } from '../../../shared/interfaces/base.interface';
import { ApiResponse } from '../../../shared/interfaces/response.interface';
import { JwtPayload } from 'jsonwebtoken'; // ^9.0.0

/**
 * Interface for Pi Network authentication payload with enhanced security fields
 * Includes KYC verification status and regional information for Egyptian market
 * 
 * @interface PiAuthPayload
 */
export interface PiAuthPayload {
  /** Pi Network authentication token */
  accessToken: string;

  /** Unique Pi Network identifier */
  piId: string;

  /** Pi Network username */
  username: string;

  /** User's assigned roles */
  roles: string[];

  /** KYC verification status flag */
  isKycVerified: boolean;

  /** Detailed KYC status */
  kycStatus: string;

  /** ISO country code (EG for Egypt) */
  countryCode: string;
}

/**
 * Interface for authentication tokens with comprehensive tracking and security
 * Implements token revocation and device fingerprinting for enhanced security
 * 
 * @interface AuthToken
 * @extends {BaseEntity}
 */
export interface AuthToken extends BaseEntity {
  /** Associated user identifier */
  userId: string;

  /** JWT access token */
  accessToken: string;

  /** JWT refresh token */
  refreshToken: string;

  /** Token expiration timestamp */
  expiresAt: Date;

  /** Token revocation status */
  isRevoked: boolean;

  /** Reason for token revocation if applicable */
  revokedReason: string;

  /** Last token usage timestamp */
  lastUsedAt: Date;

  /** Device fingerprint for security tracking */
  deviceFingerprint: string;
}

/**
 * Interface for detailed user authentication session tracking
 * Implements comprehensive session monitoring and security controls
 * 
 * @interface AuthSession
 * @extends {BaseEntity}
 */
export interface AuthSession extends BaseEntity {
  /** Associated user identifier */
  userId: string;

  /** Unique device identifier */
  deviceId: string;

  /** Client IP address */
  ipAddress: string;

  /** Client user agent string */
  userAgent: string;

  /** Last activity timestamp */
  lastActivityAt: Date;

  /** Session active status */
  isActive: boolean;

  /** Geographic location data */
  location: string;

  /** Failed login attempt counter */
  loginAttempts: number;

  /** Session-specific permissions */
  permissions: string[];
}

/**
 * Extended JWT payload with enhanced security and session binding
 * Implements additional fields for Egyptian market requirements
 * 
 * @interface JwtCustomPayload
 * @extends {JwtPayload}
 */
export interface JwtCustomPayload extends JwtPayload {
  /** User identifier */
  userId: string;

  /** Pi Network identifier */
  piId: string;

  /** User roles array */
  roles: string[];

  /** Associated session identifier */
  sessionId: string;

  /** Device identifier */
  deviceId: string;

  /** Token issuance timestamp */
  issuedAt: number;

  /** Token scope */
  scope: string;

  /** Merchant status flag */
  isMerchant: boolean;
}

/**
 * Comprehensive authentication response with token and session data
 * Provides complete authentication context for client applications
 * 
 * @interface AuthResponse
 */
export interface AuthResponse {
  /** JWT access token */
  accessToken: string;

  /** JWT refresh token */
  refreshToken: string;

  /** Token expiration time in seconds */
  expiresIn: number;

  /** Token type (Bearer) */
  tokenType: string;

  /** Associated session identifier */
  sessionId: string;

  /** User roles array */
  roles: string[];

  /** User permissions array */
  permissions: string[];

  /** KYC requirement flag */
  requiresKyc: boolean;
}

/**
 * Type guard to check if a response is an authentication response
 * 
 * @param response - API response to check
 * @returns True if the response is an authentication response
 */
export function isAuthResponse(response: ApiResponse<any>): response is ApiResponse<AuthResponse> {
  return response.success && 
         response.data && 
         'accessToken' in response.data &&
         'refreshToken' in response.data;
}