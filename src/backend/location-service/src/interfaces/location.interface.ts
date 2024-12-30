/**
 * @fileoverview Defines comprehensive TypeScript interfaces and types for location-related 
 * data structures in the Egyptian Map of Pi platform. Includes support for Egyptian geographic 
 * boundaries, governorate-level data, and culturally appropriate address formats with 
 * bilingual support.
 * 
 * @version 1.0.0
 */

import { Document } from 'mongoose'; // v6.0.0
import { BaseDocument } from '../../../shared/interfaces/base.interface';

/**
 * Defines the geographic boundaries of Egypt for coordinate validation
 * Based on official Egyptian Survey Authority data
 */
export interface EgyptianBoundaries {
  /** Southern boundary of Egypt */
  minLatitude: number; // 22.0
  /** Northern boundary of Egypt */
  maxLatitude: number; // 31.7
  /** Western boundary of Egypt */
  minLongitude: number; // 24.7
  /** Eastern boundary of Egypt */
  maxLongitude: number; // 36.9
}

/**
 * Interface for geographic coordinates with accuracy and validation
 * Coordinates must fall within Egyptian boundaries
 */
export interface Coordinates {
  /** Latitude in decimal degrees */
  latitude: number;
  /** Longitude in decimal degrees */
  longitude: number;
  /** Accuracy in meters */
  accuracy: number;
}

/**
 * Comprehensive bilingual address interface for Egyptian locations
 * Supports both Arabic and English address components
 */
export interface BilingualAddress {
  /** Street name in Arabic */
  streetAr: string;
  /** Street name in English */
  streetEn: string;
  /** City name in Arabic */
  cityAr: string;
  /** City name in English */
  cityEn: string;
  /** Governorate name in Arabic */
  governorateAr: string;
  /** Governorate name in English */
  governorateEn: string;
  /** Egyptian postal code (5 digits) */
  postalCode: string;
}

/**
 * Enumeration of possible location types in the Egyptian context
 */
export enum LocationType {
  /** Physical store location */
  STORE = 'STORE',
  /** Designated pickup point */
  PICKUP_POINT = 'PICKUP_POINT',
  /** Customer delivery address */
  DELIVERY_ADDRESS = 'DELIVERY_ADDRESS',
  /** Marketplace location */
  MARKETPLACE = 'MARKETPLACE'
}

/**
 * Enumeration of location verification statuses
 */
export enum LocationVerificationStatus {
  /** Pending initial verification */
  PENDING = 'PENDING',
  /** Successfully verified location */
  VERIFIED = 'VERIFIED',
  /** Failed verification process */
  FAILED = 'FAILED',
  /** Requires additional verification */
  NEEDS_REVIEW = 'NEEDS_REVIEW'
}

/**
 * Main location interface with Egyptian-specific validation
 * Extends BaseDocument for consistent entity tracking
 */
export interface Location extends BaseDocument {
  /** Geographic coordinates with accuracy */
  coordinates: Coordinates;
  /** Bilingual address information */
  address: BilingualAddress;
  /** Type of location */
  type: LocationType;
  /** Flag for military/restricted zones */
  isRestrictedZone: boolean;
  /** Location verification status */
  verificationStatus: LocationVerificationStatus;
  /** Optional notes about the location */
  notes?: string;
  /** Reference to associated merchant/user */
  ownerId: string;
  /** Operating hours if applicable */
  operatingHours?: {
    /** Opening time in 24-hour format */
    open: string;
    /** Closing time in 24-hour format */
    close: string;
    /** Days of operation (0-6, Sunday-Saturday) */
    days: number[];
  };
}

/**
 * MongoDB document interface for location persistence
 * Combines Location interface with MongoDB Document type
 */
export interface LocationDocument extends Location, Document {
  /** Inherits all Location properties plus MongoDB Document features */
}

/**
 * Type for location search radius constraints
 * Defines minimum and maximum search radius in kilometers
 */
export type SearchRadiusConstraints = {
  /** Minimum search radius in kilometers */
  MIN_RADIUS_KM: number;
  /** Maximum search radius in kilometers */
  MAX_RADIUS_KM: number;
};

/**
 * Constants for Egyptian location validation
 */
export const EGYPT_BOUNDARIES: EgyptianBoundaries = {
  minLatitude: 22.0,
  maxLatitude: 31.7,
  minLongitude: 24.7,
  maxLongitude: 36.9
};

/**
 * Search radius constraints for location queries
 */
export const SEARCH_RADIUS_CONSTRAINTS: SearchRadiusConstraints = {
  MIN_RADIUS_KM: 0.1,  // 100 meters minimum
  MAX_RADIUS_KM: 100   // 100 kilometers maximum
};