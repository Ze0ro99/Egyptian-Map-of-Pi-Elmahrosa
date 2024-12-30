/**
 * @fileoverview Enhanced authentication API client for Egyptian Map of Pi
 * @version 1.0.0
 * 
 * Implements secure Pi Network authentication with Egyptian market validation,
 * enhanced token management, and bilingual error handling.
 */

import { PiNetwork } from '@pi-network/sdk'; // ^2.0.0
import CryptoJS from 'crypto-js'; // ^4.1.1
import { apiService } from '../services/api.service';
import { 
  AuthUser, 
  AuthTokens, 
  KYCStatus, 
  SecurityLevel,
  TokenStatus 
} from '../interfaces/auth.interface';
import { ErrorCodes } from '../../../backend/shared/constants/error-codes';
import { getErrorMessage } from '../constants/errors';
import { setLocalStorage, getLocalStorage, removeFromStorage, StorageType } from '../utils/storage.util';

// Authentication endpoints
const AUTH_ENDPOINTS = {
  AUTHENTICATE: '/auth/authenticate',
  REFRESH_TOKEN: '/auth/refresh',
  VERIFY_KYC: '/auth/kyc/verify',
  CHECK_KYC_STATUS: '/auth/kyc/status',
  VALIDATE_EGYPTIAN_USER: '/auth/validate/egyptian',
  SECURITY_CHECK: '/auth/security/verify'
} as const;

// Retry configuration for network resilience
const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  TIMEOUT: 15000
} as const;

// Storage keys
const STORAGE_KEYS = {
  AUTH_USER: 'auth_user',
  REFRESH_TOKEN: 'refresh_token',
  DEVICE_ID: 'device_id'
} as const;

/**
 * Encrypts sensitive authentication data
 * @param data - Data to encrypt
 * @returns Encrypted string
 */
const encryptAuthData = (data: any): string => {
  const encryptionKey = process.env.NEXT_PUBLIC_AUTH_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error(getErrorMessage(ErrorCodes.SYSTEM_INTERNAL_ERROR, 'ar'));
  }
  return CryptoJS.AES.encrypt(JSON.stringify(data), encryptionKey).toString();
};

/**
 * Decrypts authentication data
 * @param encryptedData - Encrypted data string
 * @returns Decrypted data
 */
const decryptAuthData = (encryptedData: string): any => {
  const encryptionKey = process.env.NEXT_PUBLIC_AUTH_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error(getErrorMessage(ErrorCodes.SYSTEM_INTERNAL_ERROR, 'ar'));
  }
  const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
};

/**
 * Validates Egyptian market eligibility
 * @param piId - Pi Network user ID
 * @returns Validation result
 */
const validateEgyptianMarket = async (piId: string): Promise<boolean> => {
  try {
    const response = await apiService.post(AUTH_ENDPOINTS.VALIDATE_EGYPTIAN_USER, { piId });
    return response.data.isEligible;
  } catch (error) {
    console.error('Egyptian market validation failed:', error);
    return false;
  }
};

/**
 * Enhanced authentication with Pi Network including Egyptian market validation
 * @param piAuthToken - Pi Network authentication token
 * @param securityContext - Additional security context
 * @returns Authenticated user data
 */
const authenticate = async (
  piAuthToken: string,
  securityContext: { deviceId: string; platform: string }
): Promise<AuthUser> => {
  try {
    // Validate Pi Network token
    const piNetwork = new PiNetwork();
    await piNetwork.authenticate(piAuthToken);

    // Get Pi user information
    const piUser = await piNetwork.getUser();

    // Validate Egyptian market eligibility
    const isEligible = await validateEgyptianMarket(piUser.uid);
    if (!isEligible) {
      throw new Error(getErrorMessage(ErrorCodes.SECURITY_INVALID_ACCESS, 'ar'));
    }

    // Perform authentication with backend
    const authData = {
      piId: piUser.uid,
      deviceId: securityContext.deviceId,
      platform: securityContext.platform,
      timestamp: new Date().toISOString()
    };

    const encryptedAuthData = encryptAuthData(authData);
    const response = await apiService.post(AUTH_ENDPOINTS.AUTHENTICATE, {
      authData: encryptedAuthData
    });

    const authUser: AuthUser = response.data;

    // Store authentication data securely
    setLocalStorage(STORAGE_KEYS.AUTH_USER, authUser, true);
    setLocalStorage(STORAGE_KEYS.REFRESH_TOKEN, authUser.refreshToken, true);
    setLocalStorage(STORAGE_KEYS.DEVICE_ID, securityContext.deviceId, true);

    return authUser;
  } catch (error) {
    console.error('Authentication failed:', error);
    throw new Error(getErrorMessage(ErrorCodes.AUTH_INVALID_CREDENTIALS, 'ar'));
  }
};

/**
 * Refreshes authentication tokens with enhanced security
 * @param refreshToken - Current refresh token
 * @returns New authentication tokens
 */
const refreshToken = async (refreshToken: string): Promise<AuthTokens> => {
  try {
    const deviceId = getLocalStorage(STORAGE_KEYS.DEVICE_ID, true);
    if (!deviceId) {
      throw new Error(getErrorMessage(ErrorCodes.AUTH_INVALID_TOKEN, 'ar'));
    }

    const response = await apiService.post(AUTH_ENDPOINTS.REFRESH_TOKEN, {
      refreshToken,
      deviceId
    });

    const newTokens: AuthTokens = response.data;
    setLocalStorage(STORAGE_KEYS.REFRESH_TOKEN, newTokens.refreshToken, true);

    return newTokens;
  } catch (error) {
    console.error('Token refresh failed:', error);
    throw new Error(getErrorMessage(ErrorCodes.AUTH_EXPIRED_TOKEN, 'ar'));
  }
};

/**
 * Initiates KYC verification process for Egyptian users
 * @param piId - Pi Network user ID
 * @param egyptianKYCData - Egyptian-specific KYC data
 */
const verifyKYC = async (piId: string, egyptianKYCData: any): Promise<void> => {
  try {
    const encryptedKYCData = encryptAuthData(egyptianKYCData);
    await apiService.post(AUTH_ENDPOINTS.VERIFY_KYC, {
      piId,
      kycData: encryptedKYCData
    });
  } catch (error) {
    console.error('KYC verification failed:', error);
    throw new Error(getErrorMessage(ErrorCodes.AUTH_KYC_REQUIRED, 'ar'));
  }
};

/**
 * Checks current KYC verification status
 * @param piId - Pi Network user ID
 * @returns Current KYC status
 */
const checkKYCStatus = async (piId: string): Promise<KYCStatus> => {
  try {
    const response = await apiService.get(`${AUTH_ENDPOINTS.CHECK_KYC_STATUS}/${piId}`);
    return response.data.status;
  } catch (error) {
    console.error('KYC status check failed:', error);
    throw new Error(getErrorMessage(ErrorCodes.DATA_NOT_FOUND, 'ar'));
  }
};

/**
 * Logs out user and cleans up authentication data
 */
const logout = (): void => {
  removeFromStorage(STORAGE_KEYS.AUTH_USER, StorageType.LOCAL);
  removeFromStorage(STORAGE_KEYS.REFRESH_TOKEN, StorageType.LOCAL);
  removeFromStorage(STORAGE_KEYS.DEVICE_ID, StorageType.LOCAL);
};

// Export authentication API interface
export const authApi = {
  authenticate,
  refreshToken,
  verifyKYC,
  checkKYCStatus,
  logout
};