/**
 * @fileoverview Defines comprehensive TypeScript interfaces and types for merchant entities
 * in the Egyptian Map of Pi marketplace. Includes support for merchant profiles,
 * verification statuses, location data with Egyptian governorate support, and business documents.
 * 
 * @version 1.0.0
 */

import { Document } from 'mongoose'; // v6.0.0
import { BaseDocument } from '../../shared/interfaces/base.interface';

/**
 * Enum defining possible merchant verification statuses for Egyptian business verification
 */
export enum MerchantVerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED'
}

/**
 * Interface defining structure of merchant business verification documents
 * with expiry tracking for Egyptian regulatory compliance
 */
export interface BusinessDocument {
  /**
   * Type of business document (e.g., 'COMMERCIAL_REGISTRY', 'TAX_CARD', 'VAT_CERTIFICATE')
   */
  type: string;

  /**
   * Secure URL to the stored document
   */
  url: string;

  /**
   * Verification status of the document
   */
  verified: boolean;

  /**
   * Date when the document was verified
   */
  verificationDate: Date;

  /**
   * Document expiry date for compliance tracking
   */
  expiryDate: Date;
}

/**
 * Enhanced interface for merchant location data with Egyptian administrative divisions
 */
export interface MerchantLocation {
  /**
   * GeoJSON type (typically 'Point')
   */
  type: string;

  /**
   * GeoJSON coordinates [longitude, latitude]
   */
  coordinates: number[];

  /**
   * Full street address in Arabic/English
   */
  address: string;

  /**
   * Egyptian governorate (e.g., 'Cairo', 'Alexandria', 'Giza')
   */
  governorate: string;

  /**
   * District within governorate
   */
  district: string;

  /**
   * Egyptian postal code
   */
  postalCode: string;
}

/**
 * Operating hours structure for merchant business hours
 */
export interface OperatingHours {
  /**
   * Day of week (0-6, 0 being Sunday)
   */
  [key: number]: {
    /**
     * Opening time in 24-hour format (HH:mm)
     */
    open: string;
    
    /**
     * Closing time in 24-hour format (HH:mm)
     */
    close: string;
    
    /**
     * Whether the business is closed on this day
     */
    isClosed: boolean;
  };
}

/**
 * Comprehensive merchant interface extending BaseDocument with enhanced business metrics
 * and bilingual support for the Egyptian market
 */
export interface MerchantDocument extends BaseDocument, Document {
  /**
   * Pi Network unique identifier
   */
  piId: string;

  /**
   * Business name in Arabic
   */
  businessNameAr: string;

  /**
   * Business name in English
   */
  businessNameEn: string;

  /**
   * Business description in Arabic
   */
  descriptionAr: string;

  /**
   * Business description in English
   */
  descriptionEn: string;

  /**
   * Egyptian phone number with country code
   */
  phone: string;

  /**
   * Merchant's business location details
   */
  location: MerchantLocation;

  /**
   * Current verification status
   */
  verificationStatus: MerchantVerificationStatus;

  /**
   * Array of business verification documents
   */
  businessDocuments: BusinessDocument[];

  /**
   * Average merchant rating (0-5)
   */
  rating: number;

  /**
   * Total number of active listings
   */
  totalListings: number;

  /**
   * Total number of completed sales
   */
  totalSales: number;

  /**
   * Weekly operating hours
   */
  operatingHours: OperatingHours;

  /**
   * Business categories (e.g., 'Electronics', 'Fashion', 'Food')
   */
  categories: string[];
}