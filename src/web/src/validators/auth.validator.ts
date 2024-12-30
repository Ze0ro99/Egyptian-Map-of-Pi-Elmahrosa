/**
 * @fileoverview Implements comprehensive validation schemas and functions for authentication-related data
 * in the Egyptian Map of Pi web application. Provides robust token validation with expiration checks,
 * security level verification, and bilingual support.
 * @version 1.0.0
 */

import { z } from 'zod'; // v3.22.0
import { 
  AuthUser, 
  KYCStatus, 
  SecurityLevel,
  TokenStatus,
  AuthError 
} from '../interfaces/auth.interface';
import { VALIDATION_PATTERNS } from '../constants/validation';

/**
 * Enhanced Zod schema for validating authentication tokens with comprehensive security checks
 */
export const authTokenSchema = z.object({
  accessToken: z.string()
    .regex(VALIDATION_PATTERNS.PI_TOKEN, {
      message: 'Invalid Pi Network token format'
    }),
  refreshToken: z.string()
    .regex(VALIDATION_PATTERNS.PI_TOKEN, {
      message: 'Invalid Pi Network refresh token format'
    }),
  expiresIn: z.number()
    .positive()
    .max(86400, { message: 'Token expiration cannot exceed 24 hours' }),
  tokenType: z.string()
    .regex(/^Bearer$/, { 
      message: 'Only Bearer token type is supported' 
    }),
  scope: z.array(z.string())
    .min(1, { message: 'Token must have at least one scope' }),
  issuedAt: z.number()
    .positive(),
  securityLevel: z.enum([
    SecurityLevel.BASIC,
    SecurityLevel.ENHANCED,
    SecurityLevel.MAXIMUM
  ])
});

/**
 * Enhanced schema for validating KYC status transitions with detailed validation
 */
export const kycStatusSchema = z.object({
  status: z.enum([
    KYCStatus.PENDING,
    KYCStatus.IN_PROGRESS,
    KYCStatus.VERIFIED,
    KYCStatus.REJECTED,
    KYCStatus.EXPIRED,
    KYCStatus.SUSPENDED
  ]),
  lastUpdated: z.number().positive(),
  verificationExpiry: z.number().positive().optional(),
  suspensionReason: z.string().optional(),
  attempts: z.number().min(0).max(3)
});

/**
 * Validates a Pi Network authentication token with comprehensive security checks
 * @param token - The authentication token to validate
 * @param requiredLevel - The minimum required security level
 * @returns Promise resolving to validation result with detailed error if invalid
 */
export async function validateAuthToken(
  token: string,
  requiredLevel: SecurityLevel
): Promise<{ isValid: boolean; error?: AuthError }> {
  try {
    // Verify token existence and basic format
    if (!token || typeof token !== 'string') {
      return {
        isValid: false,
        error: {
          code: 'AUTH_001',
          message: 'Invalid token format'
        }
      };
    }

    // Validate token against PI_TOKEN regex pattern
    if (!VALIDATION_PATTERNS.PI_TOKEN.test(token)) {
      return {
        isValid: false,
        error: {
          code: 'AUTH_002',
          message: 'Token does not match required pattern'
        }
      };
    }

    // Decode token parts
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) {
      return {
        isValid: false,
        error: {
          code: 'AUTH_003',
          message: 'Invalid token structure'
        }
      };
    }

    // Decode and parse payload
    const decodedPayload = JSON.parse(atob(payload));

    // Check token expiration
    const currentTime = Math.floor(Date.now() / 1000);
    if (decodedPayload.exp && decodedPayload.exp < currentTime) {
      return {
        isValid: false,
        error: {
          code: 'AUTH_004',
          message: 'Token has expired',
          details: {
            expiredAt: new Date(decodedPayload.exp * 1000).toISOString()
          }
        }
      };
    }

    // Verify security level meets requirements
    if (decodedPayload.securityLevel < requiredLevel) {
      return {
        isValid: false,
        error: {
          code: 'AUTH_005',
          message: 'Insufficient security level',
          details: {
            required: requiredLevel,
            provided: decodedPayload.securityLevel
          }
        }
      };
    }

    return { isValid: true };

  } catch (error) {
    return {
      isValid: false,
      error: {
        code: 'AUTH_999',
        message: 'Token validation failed',
        details: { error: error.message }
      }
    };
  }
}

/**
 * Validates KYC status transitions with comprehensive state checks
 * @param currentStatus - The user's current KYC status
 * @param newStatus - The proposed new KYC status
 * @returns Promise resolving to validation result with transition details
 */
export async function validateKYCStatus(
  currentStatus: KYCStatus,
  newStatus: KYCStatus
): Promise<{ isValid: boolean; error?: AuthError }> {
  try {
    // Validate current status
    if (!Object.values(KYCStatus).includes(currentStatus)) {
      return {
        isValid: false,
        error: {
          code: 'KYC_001',
          message: 'Invalid current KYC status'
        }
      };
    }

    // Validate new status
    if (!Object.values(KYCStatus).includes(newStatus)) {
      return {
        isValid: false,
        error: {
          code: 'KYC_002',
          message: 'Invalid new KYC status'
        }
      };
    }

    // Define valid status transitions
    const validTransitions: Record<KYCStatus, KYCStatus[]> = {
      [KYCStatus.PENDING]: [KYCStatus.IN_PROGRESS, KYCStatus.SUSPENDED],
      [KYCStatus.IN_PROGRESS]: [KYCStatus.VERIFIED, KYCStatus.REJECTED, KYCStatus.SUSPENDED],
      [KYCStatus.VERIFIED]: [KYCStatus.EXPIRED, KYCStatus.SUSPENDED],
      [KYCStatus.REJECTED]: [KYCStatus.PENDING, KYCStatus.SUSPENDED],
      [KYCStatus.EXPIRED]: [KYCStatus.PENDING, KYCStatus.SUSPENDED],
      [KYCStatus.SUSPENDED]: [KYCStatus.PENDING]
    };

    // Check if transition is valid
    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      return {
        isValid: false,
        error: {
          code: 'KYC_003',
          message: 'Invalid KYC status transition',
          details: {
            currentStatus,
            newStatus,
            validTransitions: validTransitions[currentStatus]
          }
        }
      };
    }

    return { isValid: true };

  } catch (error) {
    return {
      isValid: false,
      error: {
        code: 'KYC_999',
        message: 'KYC validation failed',
        details: { error: error.message }
      }
    };
  }
}

/**
 * Type guard to validate AuthUser object structure
 * @param user - Object to validate as AuthUser
 * @returns Boolean indicating if object matches AuthUser interface
 */
export function isValidAuthUser(user: any): user is AuthUser {
  return (
    user &&
    typeof user.piId === 'string' &&
    typeof user.accessToken === 'string' &&
    typeof user.refreshToken === 'string' &&
    Object.values(KYCStatus).includes(user.kycStatus) &&
    typeof user.isMerchant === 'boolean' &&
    user.lastLogin instanceof Date &&
    Object.values(SecurityLevel).includes(user.securityLevel) &&
    typeof user.isActive === 'boolean' &&
    Array.isArray(user.roles) &&
    typeof user.deviceId === 'string'
  );
}