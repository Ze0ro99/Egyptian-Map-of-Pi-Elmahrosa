/**
 * @fileoverview Defines TypeScript interfaces for user-related data structures in the Egyptian Map of Pi frontend application.
 * Implements comprehensive interfaces for user and merchant profiles with enhanced support for Egyptian market requirements,
 * bilingual support (Arabic/English), and PII data protection.
 * @version 1.0.0
 */

import { AuthUser, KYCStatus } from './auth.interface';
import { Location } from './location.interface';

/**
 * Enumeration of supported languages with Arabic as primary language
 * Implements bilingual support requirement for Egyptian market
 */
export enum Language {
  /** Arabic - Primary language */
  AR = 'AR',
  /** English - Secondary language */
  EN = 'EN'
}

/**
 * Enumeration of Egyptian business classification types
 * Aligned with Egyptian commercial registration requirements
 */
export enum BusinessType {
  /** Retail businesses (تجارة التجزئة) */
  RETAIL = 'RETAIL',
  /** Wholesale businesses (تجارة الجملة) */
  WHOLESALE = 'WHOLESALE',
  /** Service providers (مقدمي الخدمات) */
  SERVICE = 'SERVICE',
  /** Manufacturing businesses (التصنيع) */
  MANUFACTURING = 'MANUFACTURING'
}

/**
 * Enhanced user interface with bilingual and Egyptian market support
 * Implements comprehensive user profile management requirements
 */
export interface User {
  /** Unique Pi Network identifier */
  piId: string;

  /** User's name in Arabic (required) */
  nameAr: string;

  /** User's name in English (optional) */
  nameEn: string;

  /** Egyptian phone number (validated format) */
  phone: string;

  /** User's email address */
  email: string;

  /** User's verified location in Egypt */
  location: Location;

  /** Current KYC verification status */
  kycStatus: KYCStatus;

  /** Flag indicating merchant status */
  isMerchant: boolean;

  /** User's preferred language */
  language: Language;

  /** Egyptian governorate of residence */
  governorate: string;
}

/**
 * Enhanced merchant profile interface with Egyptian business validation
 * Supports target of 10,000+ verified merchants
 */
export interface MerchantProfile {
  /** Business name in Arabic (required) */
  businessNameAr: string;

  /** Business name in English (optional) */
  businessNameEn: string;

  /** Egyptian business classification */
  businessType: BusinessType;

  /** Egyptian commercial registration number */
  registrationNumber: string;

  /** Egyptian tax registration number */
  taxNumber: string;

  /** Business verification status */
  verificationStatus: KYCStatus;

  /** Merchant rating (1-5 scale) */
  rating: number;

  /** Total number of reviews */
  reviewCount: number;
}

/**
 * Type guard to check if a value is a valid Language
 * @param value - Value to check
 * @returns boolean indicating if value is a valid Language
 */
export function isLanguage(value: any): value is Language {
  return Object.values(Language).includes(value as Language);
}

/**
 * Type guard to check if a value is a valid BusinessType
 * @param value - Value to check
 * @returns boolean indicating if value is a valid BusinessType
 */
export function isBusinessType(value: any): value is BusinessType {
  return Object.values(BusinessType).includes(value as BusinessType);
}

/**
 * Type for user profile update operations
 * Ensures partial updates maintain data integrity
 */
export type UserProfileUpdate = Partial<Omit<User, 'piId' | 'kycStatus'>>;

/**
 * Type for merchant profile update operations
 * Ensures partial updates maintain verification status
 */
export type MerchantProfileUpdate = Partial<Omit<MerchantProfile, 'verificationStatus' | 'rating' | 'reviewCount'>>;