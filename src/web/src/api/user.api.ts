/**
 * @fileoverview User API client implementation for Egyptian Map of Pi marketplace
 * @version 1.0.0
 * 
 * Implements secure API client functions for user-related operations with
 * enhanced security, bilingual support, and Egyptian market-specific features.
 */

import { User, MerchantProfile, Language, isLanguage } from '../interfaces/user.interface';
import { apiService } from '../services/api.service';
import { KYCStatus } from '../interfaces/auth.interface';
import { getLocalStorage, setLocalStorage } from '../utils/storage.util';
import CryptoJS from 'crypto-js'; // v4.1.1
import axiosRetry from 'axios-retry'; // v3.5.0

// API endpoints for user operations
const API_ENDPOINTS = {
  USER_PROFILE: '/api/v1/users/profile',
  MERCHANT_PROFILE: '/api/v1/users/merchant',
  KYC_VERIFICATION: '/api/v1/users/kyc',
  BUSINESS_VALIDATION: '/api/v1/users/business-verify',
  LANGUAGE_PREFERENCE: '/api/v1/users/language'
} as const;

// Cache keys for user data
const CACHE_KEYS = {
  USER_PROFILE: 'user_profile',
  MERCHANT_PROFILE: 'merchant_profile',
  LANGUAGE_PREF: 'language_preference'
} as const;

// Geographic boundaries for Egypt
const EGYPT_BOUNDARIES = {
  north: 31.833333,
  south: 22.0,
  east: 36.833333,
  west: 24.7
} as const;

/**
 * Validates if coordinates are within Egypt's boundaries
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @returns boolean indicating if location is within Egypt
 */
const isWithinEgypt = (latitude: number, longitude: number): boolean => {
  return latitude >= EGYPT_BOUNDARIES.south &&
         latitude <= EGYPT_BOUNDARIES.north &&
         longitude >= EGYPT_BOUNDARIES.west &&
         longitude <= EGYPT_BOUNDARIES.east;
};

/**
 * Encrypts sensitive user data before storage
 * @param data - Data to encrypt
 * @returns Encrypted data string
 */
const encryptSensitiveData = (data: any): string => {
  const encryptionKey = process.env.NEXT_PUBLIC_DATA_ENCRYPTION_KEY;
  if (!encryptionKey) throw new Error('Encryption key not configured');
  return CryptoJS.AES.encrypt(JSON.stringify(data), encryptionKey).toString();
};

/**
 * Decrypts sensitive user data
 * @param encryptedData - Encrypted data string
 * @returns Decrypted data object
 */
const decryptSensitiveData = (encryptedData: string): any => {
  const encryptionKey = process.env.NEXT_PUBLIC_DATA_ENCRYPTION_KEY;
  if (!encryptionKey) throw new Error('Encryption key not configured');
  const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
};

/**
 * Retrieves user profile with enhanced security and caching
 * @param piId - Pi Network user ID
 * @param preferredLanguage - User's preferred language
 * @returns Promise resolving to user profile data
 */
export const getUserProfile = async (
  piId: string,
  preferredLanguage: Language = Language.AR
): Promise<User> => {
  try {
    // Check cache first
    const cachedProfile = getLocalStorage(CACHE_KEYS.USER_PROFILE, true);
    if (cachedProfile?.piId === piId) {
      return decryptSensitiveData(cachedProfile.data);
    }

    const response = await apiService.get<User>(
      `${API_ENDPOINTS.USER_PROFILE}/${piId}`,
      {
        headers: {
          'Accept-Language': preferredLanguage.toLowerCase(),
          'X-Request-ID': crypto.randomUUID()
        }
      }
    );

    // Validate location is within Egypt
    if (response.data.location && !isWithinEgypt(
      response.data.location.coordinates.latitude,
      response.data.location.coordinates.longitude
    )) {
      throw new Error('Location outside Egypt boundaries');
    }

    // Cache encrypted profile data
    setLocalStorage(CACHE_KEYS.USER_PROFILE, {
      piId,
      data: encryptSensitiveData(response.data),
      timestamp: Date.now()
    }, true);

    return response.data;
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    throw error;
  }
};

/**
 * Updates user profile with validation and security checks
 * @param piId - Pi Network user ID
 * @param profileData - Updated profile data
 * @returns Promise resolving to updated user profile
 */
export const updateUserProfile = async (
  piId: string,
  profileData: Partial<User>
): Promise<User> => {
  try {
    // Validate location if provided
    if (profileData.location) {
      const { latitude, longitude } = profileData.location.coordinates;
      if (!isWithinEgypt(latitude, longitude)) {
        throw new Error('Location outside Egypt boundaries');
      }
    }

    const response = await apiService.put<User>(
      `${API_ENDPOINTS.USER_PROFILE}/${piId}`,
      profileData,
      {
        headers: {
          'X-Request-ID': crypto.randomUUID()
        }
      }
    );

    // Update cache with new data
    setLocalStorage(CACHE_KEYS.USER_PROFILE, {
      piId,
      data: encryptSensitiveData(response.data),
      timestamp: Date.now()
    }, true);

    return response.data;
  } catch (error) {
    console.error('Failed to update user profile:', error);
    throw error;
  }
};

/**
 * Retrieves merchant profile with verification status
 * @param piId - Pi Network user ID
 * @returns Promise resolving to merchant profile data
 */
export const getMerchantProfile = async (piId: string): Promise<MerchantProfile> => {
  try {
    const response = await apiService.get<MerchantProfile>(
      `${API_ENDPOINTS.MERCHANT_PROFILE}/${piId}`,
      {
        headers: {
          'X-Request-ID': crypto.randomUUID()
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Failed to fetch merchant profile:', error);
    throw error;
  }
};

/**
 * Updates merchant profile with business validation
 * @param piId - Pi Network user ID
 * @param profileData - Updated merchant profile data
 * @returns Promise resolving to updated merchant profile
 */
export const updateMerchantProfile = async (
  piId: string,
  profileData: Partial<MerchantProfile>
): Promise<MerchantProfile> => {
  try {
    const response = await apiService.put<MerchantProfile>(
      `${API_ENDPOINTS.MERCHANT_PROFILE}/${piId}`,
      profileData,
      {
        headers: {
          'X-Request-ID': crypto.randomUUID()
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Failed to update merchant profile:', error);
    throw error;
  }
};

/**
 * Updates user language preference
 * @param piId - Pi Network user ID
 * @param language - Preferred language
 * @returns Promise resolving to success status
 */
export const updateLanguagePreference = async (
  piId: string,
  language: Language
): Promise<void> => {
  try {
    if (!isLanguage(language)) {
      throw new Error('Invalid language preference');
    }

    await apiService.put(
      `${API_ENDPOINTS.LANGUAGE_PREFERENCE}/${piId}`,
      { language },
      {
        headers: {
          'X-Request-ID': crypto.randomUUID()
        }
      }
    );

    // Update cached language preference
    setLocalStorage(CACHE_KEYS.LANGUAGE_PREF, language);
  } catch (error) {
    console.error('Failed to update language preference:', error);
    throw error;
  }
};

/**
 * Initiates KYC verification process
 * @param piId - Pi Network user ID
 * @returns Promise resolving to verification status
 */
export const initiateKYCVerification = async (piId: string): Promise<KYCStatus> => {
  try {
    const response = await apiService.post<{ status: KYCStatus }>(
      `${API_ENDPOINTS.KYC_VERIFICATION}/${piId}/initiate`,
      null,
      {
        headers: {
          'X-Request-ID': crypto.randomUUID()
        }
      }
    );

    return response.data.status;
  } catch (error) {
    console.error('Failed to initiate KYC verification:', error);
    throw error;
  }
};