/**
 * @fileoverview Defines TypeScript interfaces for marketplace listings in the Egyptian Map of Pi frontend application.
 * Implements comprehensive interfaces for listing management with enhanced support for Egyptian market requirements,
 * bilingual content (Arabic/English), location services, and merchant verification.
 * @version 1.0.0
 */

import { Location } from './location.interface';
import { User } from './user.interface';

/**
 * Enumeration of possible listing statuses with enhanced support for Egyptian market compliance
 */
export enum ListingStatus {
  /** Initial draft state */
  DRAFT = 'DRAFT',
  
  /** Awaiting content and merchant verification */
  PENDING_REVIEW = 'PENDING_REVIEW',
  
  /** Listing is live and available */
  ACTIVE = 'ACTIVE',
  
  /** Item has been sold */
  SOLD = 'SOLD',
  
  /** Temporarily or permanently deactivated */
  INACTIVE = 'INACTIVE',
  
  /** Flagged for review due to reported issues */
  REPORTED = 'REPORTED'
}

/**
 * Enumeration of listing categories tailored for Egyptian market segments
 */
export enum ListingCategory {
  /** Traditional Egyptian fashion and textiles */
  FASHION_TRADITIONAL = 'FASHION_TRADITIONAL',
  
  /** Modern fashion and accessories */
  FASHION_MODERN = 'FASHION_MODERN',
  
  /** Electronics and technology products */
  ELECTRONICS = 'ELECTRONICS',
  
  /** Local Egyptian food products */
  FOOD_LOCAL = 'FOOD_LOCAL',
  
  /** Restaurant and catering services */
  FOOD_RESTAURANT = 'FOOD_RESTAURANT',
  
  /** Professional services */
  SERVICES_PROFESSIONAL = 'SERVICES_PROFESSIONAL',
  
  /** Traditional crafts and artisan services */
  SERVICES_CRAFTS = 'SERVICES_CRAFTS',
  
  /** Handmade products */
  HANDMADE = 'HANDMADE',
  
  /** Antiques and collectibles */
  ANTIQUES = 'ANTIQUES',
  
  /** Other categories */
  OTHER = 'OTHER'
}

/**
 * Core interface for marketplace listings with comprehensive Egyptian market support
 */
export interface Listing {
  /** Unique identifier for the listing */
  id: string;
  
  /** Title in Arabic (primary) */
  titleAr: string;
  
  /** Title in English (secondary) */
  titleEn: string;
  
  /** Detailed description in Arabic */
  descriptionAr: string;
  
  /** Detailed description in English */
  descriptionEn: string;
  
  /** Primary category classification */
  category: ListingCategory;
  
  /** Optional subcategory specification */
  subCategory?: string;
  
  /** Price in Pi cryptocurrency */
  price: number;
  
  /** Equivalent price in Egyptian Pounds (EGP) */
  priceEGP: number;
  
  /** Array of image URLs */
  images: string[];
  
  /** Location information with Egyptian address support */
  location: Location;
  
  /** Seller information with merchant verification */
  seller: User;
  
  /** Current listing status */
  status: ListingStatus;
  
  /** Searchable tags (bilingual support) */
  tags: string[];
  
  /** View count for analytics */
  views: number;
  
  /** Creation timestamp */
  createdAt: Date;
  
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Interface for listing search and filtering with Egyptian market-specific parameters
 */
export interface ListingFilter {
  /** Filter by category */
  category?: ListingCategory;
  
  /** Filter by subcategory */
  subCategory?: string;
  
  /** Minimum price in Pi */
  minPrice?: number;
  
  /** Maximum price in Pi */
  maxPrice?: number;
  
  /** Geographic coordinates for location-based search */
  location?: Location['coordinates'];
  
  /** Filter by Egyptian governorate */
  governorate?: string;
  
  /** Search radius in kilometers */
  radius?: number;
  
  /** Arabic search term */
  searchTermAr?: string;
  
  /** English search term */
  searchTermEn?: string;
  
  /** Filter by seller ID */
  sellerId?: string;
  
  /** Filter for verified merchant listings only */
  merchantVerified?: boolean;
  
  /** Filter by listing status */
  status?: ListingStatus;
  
  /** Filter by tags */
  tags?: string[];
  
  /** Pagination: page number */
  page?: number;
  
  /** Pagination: items per page */
  limit?: number;
  
  /** Sort field */
  sortBy?: string;
  
  /** Sort order (asc/desc) */
  sortOrder?: string;
}

/**
 * Type guard to check if a value is a valid ListingStatus
 * @param value - Value to check
 * @returns boolean indicating if value is a valid ListingStatus
 */
export function isListingStatus(value: any): value is ListingStatus {
  return Object.values(ListingStatus).includes(value as ListingStatus);
}

/**
 * Type guard to check if a value is a valid ListingCategory
 * @param value - Value to check
 * @returns boolean indicating if value is a valid ListingCategory
 */
export function isListingCategory(value: any): value is ListingCategory {
  return Object.values(ListingCategory).includes(value as ListingCategory);
}