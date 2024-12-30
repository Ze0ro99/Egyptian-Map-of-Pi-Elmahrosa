/**
 * @fileoverview Implements comprehensive validation schemas and functions for marketplace listings
 * in the Egyptian Map of Pi web application. Provides robust validation for both Arabic and English
 * content with specific adaptations for the Egyptian market.
 * @version 1.0.0
 */

import { z } from 'zod'; // v3.22.0
import { Listing, ListingCategory } from '../interfaces/listing.interface';
import { VALIDATION_PATTERNS, VALIDATION_LIMITS } from '../constants/validation';

/**
 * Egyptian governorates for location validation
 */
const EGYPT_GOVERNORATES = [
  'Cairo', 'Alexandria', 'Giza', 'Qalyubia', 'Gharbia', 'Menoufia',
  'Beheira', 'Kafr El Sheikh', 'Damietta', 'Dakahlia', 'Sharqia',
  'Ismailia', 'Suez', 'Port Said', 'North Sinai', 'South Sinai',
  'Red Sea', 'Matrouh', 'Fayoum', 'Beni Suef', 'Minya', 'Assiut',
  'Sohag', 'Qena', 'Luxor', 'Aswan', 'New Valley'
] as const;

/**
 * Item condition enumeration for listing validation
 */
const ITEM_CONDITIONS = [
  'NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR'
] as const;

/**
 * Geographic boundaries of Egypt for location validation
 */
const EGYPT_BOUNDARIES = {
  lat: { min: 22, max: 31.5 }, // Egypt's latitude range
  lng: { min: 25, max: 35 }    // Egypt's longitude range
} as const;

/**
 * Sanitizes text input to prevent XSS and maintain data integrity
 */
const sanitizeText = (text: string): string => {
  return text
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validates Pi cryptocurrency price and ensures it meets platform requirements
 */
const validatePiPrice = (price: number): number => {
  if (isNaN(price) || !isFinite(price)) {
    throw new Error('Invalid price value');
  }
  // Round to 6 decimal places for Pi cryptocurrency precision
  return Number(price.toFixed(6));
};

/**
 * Validates image URLs for security and content policies
 */
const validateImageUrl = (url: string): string => {
  const allowedDomains = ['cdn.egyptianmapofpi.com', 'storage.egyptianmapofpi.com'];
  try {
    const parsedUrl = new URL(url);
    if (!allowedDomains.includes(parsedUrl.hostname)) {
      throw new Error('Invalid image domain');
    }
    return url;
  } catch {
    throw new Error('Invalid image URL');
  }
};

/**
 * Validates location coordinates within Egyptian boundaries
 */
const validateLocation = (coords: { lat: number; lng: number }) => {
  const { lat, lng } = coords;
  if (
    lat < EGYPT_BOUNDARIES.lat.min || 
    lat > EGYPT_BOUNDARIES.lat.max || 
    lng < EGYPT_BOUNDARIES.lng.min || 
    lng > EGYPT_BOUNDARIES.lng.max
  ) {
    throw new Error('Location coordinates outside Egypt boundaries');
  }
  return coords;
};

/**
 * Comprehensive Zod schema for listing validation with Egyptian market specifics
 */
export const listingSchema = z.object({
  titleAr: z.string()
    .min(1, { message: 'العنوان مطلوب' })
    .max(VALIDATION_LIMITS.MAX_TITLE_LENGTH, { 
      message: `يجب ألا يتجاوز العنوان ${VALIDATION_LIMITS.MAX_TITLE_LENGTH} حرف` 
    })
    .regex(VALIDATION_PATTERNS.ARABIC_TEXT, { 
      message: 'يجب أن يحتوي العنوان على نص عربي صحيح' 
    })
    .transform(sanitizeText),

  titleEn: z.string()
    .min(1, { message: 'Title is required' })
    .max(VALIDATION_LIMITS.MAX_TITLE_LENGTH, { 
      message: `Title must not exceed ${VALIDATION_LIMITS.MAX_TITLE_LENGTH} characters` 
    })
    .regex(VALIDATION_PATTERNS.ENGLISH_TEXT, { 
      message: 'Title must contain valid English text' 
    })
    .transform(sanitizeText),

  descriptionAr: z.string()
    .min(1, { message: 'الوصف مطلوب' })
    .max(VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH, { 
      message: `يجب ألا يتجاوز الوصف ${VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH} حرف` 
    })
    .regex(VALIDATION_PATTERNS.ARABIC_TEXT, { 
      message: 'يجب أن يحتوي الوصف على نص عربي صحيح' 
    })
    .transform(sanitizeText),

  descriptionEn: z.string()
    .min(1, { message: 'Description is required' })
    .max(VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH, { 
      message: `Description must not exceed ${VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH} characters` 
    })
    .regex(VALIDATION_PATTERNS.ENGLISH_TEXT, { 
      message: 'Description must contain valid English text' 
    })
    .transform(sanitizeText),

  category: z.nativeEnum(ListingCategory, {
    errorMap: () => ({ message: 'Invalid category selected' })
  }),

  price: z.number()
    .min(VALIDATION_LIMITS.MIN_PI_PRICE, { 
      message: `Minimum price is ${VALIDATION_LIMITS.MIN_PI_PRICE} Pi` 
    })
    .max(VALIDATION_LIMITS.MAX_PI_PRICE, { 
      message: `Maximum price is ${VALIDATION_LIMITS.MAX_PI_PRICE} Pi` 
    })
    .transform(validatePiPrice),

  images: z.array(z.string().url().transform(validateImageUrl))
    .min(1, { message: 'At least one image is required' })
    .max(VALIDATION_LIMITS.MAX_IMAGES, { 
      message: `Maximum ${VALIDATION_LIMITS.MAX_IMAGES} images allowed` 
    }),

  location: z.object({
    coordinates: z.object({
      lat: z.number(),
      lng: z.number()
    }).transform(validateLocation)
  }),

  contactPhone: z.string()
    .regex(VALIDATION_PATTERNS.EGYPTIAN_PHONE, { 
      message: 'Invalid Egyptian phone number' 
    })
    .optional(),

  governorate: z.enum(EGYPT_GOVERNORATES, {
    errorMap: () => ({ message: 'Invalid Egyptian governorate' })
  }),

  condition: z.enum(ITEM_CONDITIONS, {
    errorMap: () => ({ message: 'Invalid item condition' })
  }),

  tags: z.array(
    z.string()
      .regex(VALIDATION_PATTERNS.ARABIC_TEXT)
      .or(z.string().regex(VALIDATION_PATTERNS.ENGLISH_TEXT))
  ).max(VALIDATION_LIMITS.MAX_TAGS_PER_LISTING, {
    message: `Maximum ${VALIDATION_LIMITS.MAX_TAGS_PER_LISTING} tags allowed`
  })
});

/**
 * Validates a listing object with comprehensive error handling and bilingual messages
 * @param listing - Partial listing object to validate
 * @returns Validation result with bilingual error messages
 */
export const validateListing = async (
  listing: Partial<Listing>
): Promise<{ isValid: boolean; errors?: { ar: string[]; en: string[] } }> => {
  try {
    await listingSchema.parseAsync(listing);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = {
        ar: [] as string[],
        en: [] as string[]
      };

      error.errors.forEach(err => {
        // Add both Arabic and English error messages
        if (err.path[0]?.toString().endsWith('Ar')) {
          errors.ar.push(err.message);
        } else if (err.path[0]?.toString().endsWith('En')) {
          errors.en.push(err.message);
        } else {
          // Add generic errors to both languages
          errors.ar.push(err.message);
          errors.en.push(err.message);
        }
      });

      return {
        isValid: false,
        errors
      };
    }
    
    // Handle unexpected errors
    return {
      isValid: false,
      errors: {
        ar: ['حدث خطأ غير متوقع أثناء التحقق من صحة القائمة'],
        en: ['An unexpected error occurred while validating the listing']
      }
    };
  }
};