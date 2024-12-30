/**
 * @fileoverview Implements secure JWT configuration for the Egyptian Map of Pi authentication service.
 * Provides robust token management with enhanced security features, automatic secret rotation,
 * and comprehensive validation in compliance with Egyptian data protection requirements.
 * 
 * @version 1.0.0
 */

import { SignOptions } from 'jsonwebtoken'; // ^9.0.0
import { AuthConfig } from '../../../shared/interfaces/config.interface';

// Security constants
const JWT_ALGORITHM = 'HS256' as const;
const JWT_ISSUER = 'egyptian-map-of-pi' as const;
const MIN_SECRET_LENGTH = 32;
const DEFAULT_ACCESS_TOKEN_EXPIRY = 3600; // 1 hour in seconds
const DEFAULT_REFRESH_TOKEN_EXPIRY = 604800; // 7 days in seconds

/**
 * Comprehensive JWT configuration interface with enhanced security parameters
 * Implements security framework requirements for token management
 */
interface JwtConfig {
  /** Secret key for token signing with minimum length and complexity requirements */
  secret: string;
  
  /** JWT signing options with strict algorithm and issuer verification */
  signOptions: SignOptions;
  
  /** Access token expiration time in seconds */
  accessTokenExpiresIn: number;
  
  /** Refresh token expiration time in seconds */
  refreshTokenExpiresIn: number;
  
  /** Flag to enable automatic secret rotation for enhanced security */
  enableTokenRotation: boolean;
  
  /** Interval for secret rotation in milliseconds */
  secretRotationInterval: number;
  
  /** List of valid token issuers for enhanced validation */
  validIssuers: string[];
}

/**
 * Validates JWT secret complexity and length requirements
 * Implements security framework specifications for token secrets
 * 
 * @param secret - JWT secret to validate
 * @returns boolean indicating if secret meets security requirements
 */
function validateJwtSecret(secret: string): boolean {
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    return false;
  }

  // Check for complexity requirements
  const hasUpperCase = /[A-Z]/.test(secret);
  const hasLowerCase = /[a-z]/.test(secret);
  const hasNumbers = /\d/.test(secret);
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(secret);

  return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChars;
}

/**
 * Retrieves and validates JWT configuration with enhanced security measures
 * Implements authentication flow requirements from technical specifications
 * 
 * @returns Validated JWT configuration object with security parameters
 * @throws Error if JWT secret validation fails
 */
function getJwtConfig(): JwtConfig {
  const config = process.env as unknown as AuthConfig;
  
  // Validate JWT secret
  if (!validateJwtSecret(config.jwtSecret)) {
    throw new Error('Invalid JWT secret: Must meet minimum length and complexity requirements');
  }

  // Configure JWT with secure defaults and environment overrides
  const jwtConfig: JwtConfig = {
    secret: config.jwtSecret,
    signOptions: {
      algorithm: JWT_ALGORITHM,
      issuer: JWT_ISSUER,
      expiresIn: config.jwtExpiresIn || DEFAULT_ACCESS_TOKEN_EXPIRY,
      notBefore: 0, // Token valid immediately after issuance
      jwtid: undefined, // Will be generated per token
    },
    accessTokenExpiresIn: parseInt(config.jwtExpiresIn || DEFAULT_ACCESS_TOKEN_EXPIRY.toString(), 10),
    refreshTokenExpiresIn: config.refreshTokenExpiresIn || DEFAULT_REFRESH_TOKEN_EXPIRY,
    enableTokenRotation: true,
    secretRotationInterval: 86400000, // 24 hours in milliseconds
    validIssuers: [JWT_ISSUER],
  };

  return jwtConfig;
}

// Export validated JWT configuration
export const jwtConfig = getJwtConfig();

// Export individual configuration properties for selective imports
export const {
  secret,
  signOptions,
  accessTokenExpiresIn,
  refreshTokenExpiresIn,
  enableTokenRotation,
  secretRotationInterval,
  validIssuers,
} = jwtConfig;