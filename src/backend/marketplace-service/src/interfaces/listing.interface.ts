/**
 * @fileoverview Defines comprehensive interfaces and types for marketplace listings
 * in the Egyptian Map of Pi application. Implements robust support for bilingual content,
 * geolocation services, and Egyptian market-specific requirements.
 * 
 * @version 1.0.0
 */

import { Document } from 'mongoose'; // v6.0.0
import { BaseDocument, BaseEntity, BaseFilter, Coordinates } from '../../../shared/interfaces/base.interface';
import { MerchantDocument } from './merchant.interface';

/**
 * Enumeration for listing status values with Egyptian marketplace workflow support
 */
export enum ListingStatus {
  /**
   * Listing is saved but not yet published
   */
  DRAFT = 'DRAFT',

  /**
   * Listing is published and available for purchase
   */
  ACTIVE = 'ACTIVE',

  /**
   * Listing has been sold
   */
  SOLD = 'SOLD',

  /**
   * Listing has been deactivated by seller or admin
   */
  INACTIVE = 'INACTIVE'
}

/**
 * Enhanced interface for listing MongoDB documents with comprehensive support
 * for Egyptian market requirements including bilingual content and location services
 */
export interface ListingDocument extends BaseDocument, Document {
  /**
   * Reference to the merchant who created the listing
   */
  sellerId: MerchantDocument['id'];

  /**
   * Product title in Arabic (primary language)
   * @minLength 3
   * @maxLength 100
   */
  titleAr: string;

  /**
   * Product title in English (secondary language)
   * @minLength 3
   * @maxLength 100
   */
  titleEn: string;

  /**
   * Detailed description in Arabic
   * @minLength 10
   * @maxLength 2000
   */
  descriptionAr: string;

  /**
   * Detailed description in English
   * @minLength 10
   * @maxLength 2000
   */
  descriptionEn: string;

  /**
   * Product category (e.g., 'Electronics', 'Fashion', 'Furniture')
   */
  category: string;

  /**
   * Price in Pi cryptocurrency
   * @min 0
   */
  price: number;

  /**
   * Array of image URLs for the product
   * @maxItems 10
   */
  images: string[];

  /**
   * GeoJSON coordinates for item location
   */
  location: Coordinates;

  /**
   * Current status of the listing
   */
  status: ListingStatus;

  /**
   * Number of times the listing has been viewed
   * @default 0
   */
  views: number;

  /**
   * Egyptian governorate where the item is located
   */
  governorate: string;

  /**
   * Search tags for improved discoverability
   * @maxItems 10
   */
  tags: string[];

  /**
   * Product condition (e.g., 'New', 'Used', 'Refurbished')
   */
  condition: string;
}

/**
 * Enhanced interface for listing search/filter parameters with support for
 * location-based discovery and Egyptian market-specific filters
 */
export interface ListingFilter extends BaseFilter {
  /**
   * Filter by product category
   */
  category?: string;

  /**
   * Filter by listing status
   */
  status?: ListingStatus;

  /**
   * Minimum price in Pi
   * @min 0
   */
  minPrice?: number;

  /**
   * Maximum price in Pi
   * @min 0
   */
  maxPrice?: number;

  /**
   * Center point for location-based search
   */
  location?: Coordinates;

  /**
   * Search radius in kilometers
   * @min 0
   * @max 100
   */
  radius?: number;

  /**
   * Search term for title and description (supports Arabic and English)
   */
  searchTerm?: string;

  /**
   * Filter by Egyptian governorate
   */
  governorate?: string;

  /**
   * Filter by specific tags
   */
  tags?: string[];

  /**
   * Filter by product condition
   */
  condition?: string;

  /**
   * Sort field (e.g., 'price', 'createdAt', 'views')
   */
  sortBy?: string;

  /**
   * Sort order ('asc' or 'desc')
   */
  sortOrder?: string;
}