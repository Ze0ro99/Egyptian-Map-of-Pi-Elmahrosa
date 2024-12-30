/**
 * @fileoverview Validation constants for the Egyptian Map of Pi web application
 * Implements comprehensive validation patterns and limits with bilingual support
 * for Arabic (primary) and English (secondary) languages.
 * @version 1.0.0
 */

/**
 * Regular expression patterns for input validation with bilingual support
 * Includes specialized patterns for Arabic text, English text, Egyptian phone numbers,
 * and other marketplace-specific validation requirements
 */
export const VALIDATION_PATTERNS = {
  /**
   * Validates Arabic text including all Arabic Unicode ranges
   * Allows Arabic letters, diacritics, punctuation marks, and whitespace
   */
  ARABIC_TEXT: /^[\u0600-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-\ufeff\s،.]+$/,

  /**
   * Validates English text including alphanumeric characters
   * Allows letters, numbers, punctuation marks, symbols, and whitespace
   */
  ENGLISH_TEXT: /^[a-zA-Z0-9\s\p{P}\p{S}]+$/u,

  /**
   * Validates Egyptian phone numbers
   * Supports formats: +201xxxxxxxxx, 01xxxxxxxxx
   * Valid prefixes: 010, 011, 012, 015
   */
  EGYPTIAN_PHONE: /^(\+20|0)?1[0125][0-9]{8}$/,

  /**
   * Validates Pi Network JWT token format
   * Follows standard JWT structure with three base64url-encoded segments
   */
  PI_TOKEN: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*$/,

  /**
   * Validates email addresses
   * Follows standard email format with optional subdomains
   */
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,

  /**
   * Validates geographic coordinates
   * Format: latitude,longitude (e.g., "30.0444,31.2357" for Cairo)
   */
  LOCATION_COORDINATES: /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/,

  /**
   * Validates mixed Arabic and English text
   * Allows both Arabic and English characters, numbers, and punctuation
   */
  MIXED_LANGUAGE_TEXT: /^[\u0600-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-\ufeffa-zA-Z0-9\s\p{P}\p{S}،.]+$/u,
} as const;

/**
 * Numerical limits and thresholds for validation rules
 * Defines maximum and minimum values for various input fields and constraints
 */
export const VALIDATION_LIMITS = {
  /**
   * Maximum length for listing titles in both Arabic and English
   * Ensures titles remain concise and displayable
   */
  MAX_TITLE_LENGTH: 100,

  /**
   * Maximum length for listing descriptions
   * Allows detailed product information while preventing excessive content
   */
  MAX_DESCRIPTION_LENGTH: 1000,

  /**
   * Maximum number of images allowed per listing
   * Balances user experience with storage constraints
   */
  MAX_IMAGES: 5,

  /**
   * Minimum Pi cryptocurrency price allowed for listings
   * Set to 0.000001 Pi to allow micro-transactions
   */
  MIN_PI_PRICE: 0.000001,

  /**
   * Maximum Pi cryptocurrency price allowed for listings
   * Set to 1,000,000 Pi to prevent unreasonable listings
   */
  MAX_PI_PRICE: 1000000,

  /**
   * Maximum length for chat messages
   * Ensures reasonable message sizes for real-time communication
   */
  MAX_CHAT_MESSAGE_LENGTH: 500,

  /**
   * Maximum length for search queries
   * Optimizes search performance while allowing meaningful queries
   */
  MAX_SEARCH_QUERY_LENGTH: 50,

  /**
   * Maximum radius for location-based searches in kilometers
   * Covers major Egyptian metropolitan areas
   */
  MAX_LOCATION_RADIUS_KM: 100,

  /**
   * Minimum radius for location-based searches in kilometers
   * Ensures reasonable local search precision
   */
  MIN_LOCATION_RADIUS_KM: 1,

  /**
   * Maximum number of tags allowed per listing
   * Optimizes categorization while preventing tag spam
   */
  MAX_TAGS_PER_LISTING: 10,

  /**
   * Maximum length for individual tags
   * Ensures tags remain concise and meaningful
   */
  MAX_TAG_LENGTH: 30,
} as const;