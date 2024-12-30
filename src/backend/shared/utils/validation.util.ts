/**
 * @fileoverview Comprehensive validation utilities for the Egyptian Map of Pi backend services
 * @version 1.0.0
 * 
 * Implements robust validation logic for user inputs, API requests, and data transformations
 * with specialized support for Arabic and English content, Egyptian geographical boundaries,
 * and Pi cryptocurrency amounts.
 */

import { validate, ValidationError, registerDecorator, ValidationOptions } from 'class-validator'; // v0.14.0
import { plainToClass } from 'class-transformer'; // v0.5.1
import { ErrorCodes } from '../constants/error-codes';
import { ErrorResponse } from '../interfaces/response.interface';

// Cache for validation results to optimize performance
const validationCache = new Map<string, ErrorResponse | null>();

/**
 * Validates input data against a validation schema with comprehensive support
 * for Arabic and English content
 * 
 * @param data - Data to validate
 * @param validationSchema - Class-validator decorated class to validate against
 * @returns Promise<ErrorResponse | null> - Validation error response or null if valid
 */
export async function validateInput(data: any, validationSchema: any): Promise<ErrorResponse | null> {
  // Generate cache key based on input data and schema
  const cacheKey = `${JSON.stringify(data)}_${validationSchema.name}`;
  
  // Check cache first
  if (validationCache.has(cacheKey)) {
    return validationCache.get(cacheKey) || null;
  }

  // Transform plain object to class instance
  const instance = plainToClass(validationSchema, data);
  
  // Validate using class-validator
  const errors: ValidationError[] = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
    validationError: { target: false }
  });

  if (errors.length > 0) {
    const errorResponse: ErrorResponse = {
      code: ErrorCodes.DATA_VALIDATION_FAILED,
      message: 'Validation failed',
      details: errors.map(error => Object.values(error.constraints || {}).join(', ')),
      timestamp: new Date().toISOString(),
      requestId: generateRequestId()
    };
    
    // Cache the error response
    validationCache.set(cacheKey, errorResponse);
    return errorResponse;
  }

  // Cache successful validation
  validationCache.set(cacheKey, null);
  return null;
}

/**
 * Validates content in both Arabic and English languages with enhanced cultural sensitivity
 * 
 * @param arabicContent - Content in Arabic
 * @param englishContent - Content in English
 * @returns boolean - True if both language contents are valid
 */
export function validateLanguageContent(arabicContent: string, englishContent: string): boolean {
  // Arabic content validation
  const arabicRegex = /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s،.؟!]+$/;
  const arabicValid = arabicRegex.test(arabicContent) && 
                     arabicContent.length >= 3 && 
                     arabicContent.length <= 1000;

  // English content validation
  const englishRegex = /^[A-Za-z0-9\s.,!?-]+$/;
  const englishValid = englishRegex.test(englishContent) && 
                      englishContent.length >= 3 && 
                      englishContent.length <= 1000;

  return arabicValid && englishValid;
}

/**
 * Validates Pi cryptocurrency amounts with Egypt-specific rules
 * 
 * @param amount - Amount in Pi to validate
 * @returns boolean - True if amount is valid
 */
export function validatePiAmount(amount: number): boolean {
  // Basic amount validation
  if (!amount || amount <= 0) return false;
  
  // Check decimal places (max 4 for Pi)
  const decimalPlaces = amount.toString().split('.')[1]?.length || 0;
  if (decimalPlaces > 4) return false;

  // Transaction limits
  const MIN_TRANSACTION = 0.1;
  const MAX_TRANSACTION = 1000000; // 1 million Pi
  
  return amount >= MIN_TRANSACTION && amount <= MAX_TRANSACTION;
}

/**
 * Validates Egyptian geographical coordinates with precise boundary checking
 * 
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @returns boolean - True if coordinates are within Egypt
 */
export function validateLocation(latitude: number, longitude: number): boolean {
  // Egypt's geographical boundaries
  const EGYPT_BOUNDS = {
    north: 31.833333, // Mediterranean Sea
    south: 22.0, // Sudan border
    east: 36.916667, // Red Sea
    west: 24.7, // Libya border
  };

  // Validate coordinate format
  if (!isFinite(latitude) || !isFinite(longitude)) return false;

  // Check if coordinates are within Egypt's boundaries
  return latitude >= EGYPT_BOUNDS.south &&
         latitude <= EGYPT_BOUNDS.north &&
         longitude >= EGYPT_BOUNDS.west &&
         longitude <= EGYPT_BOUNDS.east;
}

/**
 * Generates a unique request ID for error tracking
 * @returns string - Unique request ID
 */
function generateRequestId(): string {
  return `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Custom validator decorator for Arabic text
 */
export function IsArabicText(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isArabicText',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;
          const arabicRegex = /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s،.؟!]+$/;
          return arabicRegex.test(value);
        }
      }
    });
  };
}

/**
 * Custom validator decorator for Pi amounts
 */
export function IsPiAmount(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isPiAmount',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return validatePiAmount(Number(value));
        }
      }
    });
  };
}