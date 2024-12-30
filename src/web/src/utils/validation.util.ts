/**
 * @fileoverview Validation utilities for the Egyptian Map of Pi web application
 * Provides comprehensive validation functions with bilingual support and
 * specialized handling for Pi Network integration and Egyptian requirements.
 * @version 1.0.0
 */

import { z } from 'zod'; // v3.22.0
import {
  VALIDATION_PATTERNS,
  VALIDATION_LIMITS
} from '../constants/validation';

/**
 * Custom error class for validation errors with error codes
 * Maps to error code range 3000-3999 as specified in technical documentation
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public code: number
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Type guard to check if value is string
 * @param value - Value to check
 */
const isString = (value: unknown): value is string => {
  return typeof value === 'string';
};

/**
 * Type guard to check if value is number
 * @param value - Value to check
 */
const isNumber = (value: unknown): value is number => {
  return typeof value === 'number' && !isNaN(value);
};

/**
 * Sanitizes input string to prevent XSS attacks
 * @param input - String to sanitize
 */
const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '')
    .trim();
};

/**
 * Validates Pi Network authentication tokens
 * @param token - Pi Network JWT token to validate
 * @throws {ValidationError} If token is invalid
 */
export const validatePiToken = (token: unknown): boolean => {
  try {
    if (!isString(token)) {
      throw new ValidationError('Token must be a string', 3001);
    }

    const sanitizedToken = sanitizeInput(token);
    
    if (!sanitizedToken) {
      throw new ValidationError('Token cannot be empty', 3002);
    }

    if (!VALIDATION_PATTERNS.PI_TOKEN.test(sanitizedToken)) {
      throw new ValidationError('Invalid token format', 3003);
    }

    return true;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError('Token validation failed', 3000);
  }
};

/**
 * Validates Arabic text content with RTL support
 * @param text - Arabic text to validate
 * @param isDescription - Whether text is a description (affects length limit)
 * @throws {ValidationError} If text is invalid
 */
export const validateArabicText = (text: unknown, isDescription = false): boolean => {
  try {
    if (!isString(text)) {
      throw new ValidationError('Text must be a string', 3101);
    }

    const sanitizedText = sanitizeInput(text);
    
    if (!sanitizedText) {
      throw new ValidationError('Text cannot be empty', 3102);
    }

    const maxLength = isDescription ? 
      VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH : 
      VALIDATION_LIMITS.MAX_TITLE_LENGTH;

    if (sanitizedText.length > maxLength) {
      throw new ValidationError(
        `Text exceeds maximum length of ${maxLength} characters`,
        3103
      );
    }

    if (!VALIDATION_PATTERNS.ARABIC_TEXT.test(sanitizedText)) {
      throw new ValidationError('Text contains invalid characters', 3104);
    }

    return true;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError('Arabic text validation failed', 3100);
  }
};

/**
 * Validates English text content
 * @param text - English text to validate
 * @param isDescription - Whether text is a description (affects length limit)
 * @throws {ValidationError} If text is invalid
 */
export const validateEnglishText = (text: unknown, isDescription = false): boolean => {
  try {
    if (!isString(text)) {
      throw new ValidationError('Text must be a string', 3201);
    }

    const sanitizedText = sanitizeInput(text);
    
    if (!sanitizedText) {
      throw new ValidationError('Text cannot be empty', 3202);
    }

    const maxLength = isDescription ? 
      VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH : 
      VALIDATION_LIMITS.MAX_TITLE_LENGTH;

    if (sanitizedText.length > maxLength) {
      throw new ValidationError(
        `Text exceeds maximum length of ${maxLength} characters`,
        3203
      );
    }

    if (!VALIDATION_PATTERNS.ENGLISH_TEXT.test(sanitizedText)) {
      throw new ValidationError('Text contains invalid characters', 3204);
    }

    return true;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError('English text validation failed', 3200);
  }
};

/**
 * Validates Egyptian phone numbers
 * @param phone - Phone number to validate
 * @throws {ValidationError} If phone number is invalid
 */
export const validateEgyptianPhone = (phone: unknown): boolean => {
  try {
    if (!isString(phone)) {
      throw new ValidationError('Phone must be a string', 3301);
    }

    const sanitizedPhone = sanitizeInput(phone).replace(/\s+/g, '');
    
    if (!sanitizedPhone) {
      throw new ValidationError('Phone cannot be empty', 3302);
    }

    if (!VALIDATION_PATTERNS.EGYPTIAN_PHONE.test(sanitizedPhone)) {
      throw new ValidationError('Invalid Egyptian phone number format', 3303);
    }

    // Validate carrier code
    const carrierCode = sanitizedPhone.slice(-11, -8);
    if (!['010', '011', '012', '015'].includes(carrierCode)) {
      throw new ValidationError('Invalid Egyptian carrier code', 3304);
    }

    return true;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError('Phone validation failed', 3300);
  }
};

/**
 * Validates Pi cryptocurrency price values
 * @param price - Price in Pi to validate
 * @throws {ValidationError} If price is invalid
 */
export const validatePiPrice = (price: unknown): boolean => {
  try {
    if (!isNumber(price)) {
      throw new ValidationError('Price must be a number', 3401);
    }

    if (price < VALIDATION_LIMITS.MIN_PI_PRICE) {
      throw new ValidationError(
        `Price must be at least ${VALIDATION_LIMITS.MIN_PI_PRICE} Pi`,
        3402
      );
    }

    if (price > VALIDATION_LIMITS.MAX_PI_PRICE) {
      throw new ValidationError(
        `Price cannot exceed ${VALIDATION_LIMITS.MAX_PI_PRICE} Pi`,
        3403
      );
    }

    // Validate decimal precision (max 8 decimal places)
    const decimalPlaces = price.toString().split('.')[1]?.length || 0;
    if (decimalPlaces > 8) {
      throw new ValidationError('Price cannot have more than 8 decimal places', 3404);
    }

    return true;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError('Price validation failed', 3400);
  }
};

/**
 * Zod schema for comprehensive validation of listing data
 */
export const listingSchema = z.object({
  titleAr: z.string()
    .min(1, { message: 'Arabic title is required' })
    .max(VALIDATION_LIMITS.MAX_TITLE_LENGTH)
    .refine(text => VALIDATION_PATTERNS.ARABIC_TEXT.test(text), {
      message: 'Invalid Arabic characters in title'
    }),
  
  titleEn: z.string()
    .min(1, { message: 'English title is required' })
    .max(VALIDATION_LIMITS.MAX_TITLE_LENGTH)
    .refine(text => VALIDATION_PATTERNS.ENGLISH_TEXT.test(text), {
      message: 'Invalid English characters in title'
    }),
  
  descriptionAr: z.string()
    .max(VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH)
    .refine(text => VALIDATION_PATTERNS.ARABIC_TEXT.test(text), {
      message: 'Invalid Arabic characters in description'
    })
    .optional(),
  
  descriptionEn: z.string()
    .max(VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH)
    .refine(text => VALIDATION_PATTERNS.ENGLISH_TEXT.test(text), {
      message: 'Invalid English characters in description'
    })
    .optional(),
  
  price: z.number()
    .min(VALIDATION_LIMITS.MIN_PI_PRICE)
    .max(VALIDATION_LIMITS.MAX_PI_PRICE)
    .refine(price => {
      const decimalPlaces = price.toString().split('.')[1]?.length || 0;
      return decimalPlaces <= 8;
    }, {
      message: 'Price cannot have more than 8 decimal places'
    }),
  
  phone: z.string()
    .refine(phone => VALIDATION_PATTERNS.EGYPTIAN_PHONE.test(phone), {
      message: 'Invalid Egyptian phone number'
    })
});