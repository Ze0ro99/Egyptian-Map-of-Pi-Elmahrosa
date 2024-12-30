/**
 * @fileoverview Profile validation schemas and functions for the Egyptian Map of Pi web application
 * Implements comprehensive validation for user and merchant profiles with bilingual support
 * and enhanced security checks.
 * @version 1.0.0
 */

import { z } from 'zod'; // v3.22.0
import { User, MerchantProfile } from '../interfaces/user.interface';
import { VALIDATION_PATTERNS } from '../constants/validation';

/**
 * Geographic boundaries for Egypt
 */
const EGYPT_COORDINATES = {
  LAT_MIN: 22,
  LAT_MAX: 31.5,
  LNG_MIN: 25,
  LNG_MAX: 35,
} as const;

/**
 * Enhanced validation schema for user profiles
 * Implements comprehensive validation with bilingual support
 */
export const userProfileSchema = z.object({
  piId: z.string().min(1, {
    message: {
      en: 'Pi Network ID is required',
      ar: 'معرف شبكة باي مطلوب'
    }
  }),

  nameAr: z.string()
    .min(2, {
      message: {
        en: 'Arabic name must be at least 2 characters',
        ar: 'يجب أن يكون الاسم باللغة العربية حرفين على الأقل'
      }
    })
    .max(50, {
      message: {
        en: 'Arabic name cannot exceed 50 characters',
        ar: 'لا يمكن أن يتجاوز الاسم باللغة العربية 50 حرفاً'
      }
    })
    .regex(VALIDATION_PATTERNS.ARABIC_TEXT, {
      message: {
        en: 'Name must contain only Arabic characters',
        ar: 'يجب أن يحتوي الاسم على أحرف عربية فقط'
      }
    }),

  nameEn: z.string()
    .min(2, {
      message: {
        en: 'English name must be at least 2 characters',
        ar: 'يجب أن يكون الاسم باللغة الإنجليزية حرفين على الأقل'
      }
    })
    .max(50, {
      message: {
        en: 'English name cannot exceed 50 characters',
        ar: 'لا يمكن أن يتجاوز الاسم باللغة الإنجليزية 50 حرفاً'
      }
    })
    .regex(VALIDATION_PATTERNS.ENGLISH_TEXT, {
      message: {
        en: 'Name must contain only English characters',
        ar: 'يجب أن يحتوي الاسم على أحرف إنجليزية فقط'
      }
    })
    .optional(),

  phone: z.string()
    .regex(VALIDATION_PATTERNS.EGYPTIAN_PHONE, {
      message: {
        en: 'Invalid Egyptian phone number format',
        ar: 'صيغة رقم الهاتف المصري غير صحيحة'
      }
    }),

  email: z.string()
    .email({
      message: {
        en: 'Invalid email address format',
        ar: 'صيغة البريد الإلكتروني غير صحيحة'
      }
    })
    .regex(VALIDATION_PATTERNS.EMAIL, {
      message: {
        en: 'Invalid email address format',
        ar: 'صيغة البريد الإلكتروني غير صحيحة'
      }
    }),

  location: z.object({
    coordinates: z.object({
      latitude: z.number()
        .min(EGYPT_COORDINATES.LAT_MIN, {
          message: {
            en: 'Latitude must be within Egypt boundaries',
            ar: 'يجب أن يكون خط العرض ضمن حدود مصر'
          }
        })
        .max(EGYPT_COORDINATES.LAT_MAX, {
          message: {
            en: 'Latitude must be within Egypt boundaries',
            ar: 'يجب أن يكون خط العرض ضمن حدود مصر'
          }
        }),
      longitude: z.number()
        .min(EGYPT_COORDINATES.LNG_MIN, {
          message: {
            en: 'Longitude must be within Egypt boundaries',
            ar: 'يجب أن يكون خط الطول ضمن حدود مصر'
          }
        })
        .max(EGYPT_COORDINATES.LNG_MAX, {
          message: {
            en: 'Longitude must be within Egypt boundaries',
            ar: 'يجب أن يكون خط الطول ضمن حدود مصر'
          }
        }),
    }),
    address: z.object({
      street: z.string().min(1),
      district: z.string().min(1),
      city: z.string().min(1),
      governorate: z.string().min(1),
      postalCode: z.string().length(5),
      streetNameAr: z.string().regex(VALIDATION_PATTERNS.ARABIC_TEXT),
      districtAr: z.string().regex(VALIDATION_PATTERNS.ARABIC_TEXT),
      cityAr: z.string().regex(VALIDATION_PATTERNS.ARABIC_TEXT),
      governorateAr: z.string().regex(VALIDATION_PATTERNS.ARABIC_TEXT),
    }),
  }),
});

/**
 * Enhanced validation schema for merchant profiles
 * Implements additional business-specific validation rules
 */
export const merchantProfileSchema = userProfileSchema.extend({
  businessNameAr: z.string()
    .min(2, {
      message: {
        en: 'Arabic business name must be at least 2 characters',
        ar: 'يجب أن يكون اسم العمل باللغة العربية حرفين على الأقل'
      }
    })
    .max(100, {
      message: {
        en: 'Arabic business name cannot exceed 100 characters',
        ar: 'لا يمكن أن يتجاوز اسم العمل باللغة العربية 100 حرف'
      }
    })
    .regex(VALIDATION_PATTERNS.ARABIC_TEXT, {
      message: {
        en: 'Business name must contain only Arabic characters',
        ar: 'يجب أن يحتوي اسم العمل على أحرف عربية فقط'
      }
    }),

  businessNameEn: z.string()
    .min(2, {
      message: {
        en: 'English business name must be at least 2 characters',
        ar: 'يجب أن يكون اسم العمل باللغة الإنجليزية حرفين على الأقل'
      }
    })
    .max(100, {
      message: {
        en: 'English business name cannot exceed 100 characters',
        ar: 'لا يمكن أن يتجاوز اسم العمل باللغة الإنجليزية 100 حرف'
      }
    })
    .regex(VALIDATION_PATTERNS.ENGLISH_TEXT, {
      message: {
        en: 'Business name must contain only English characters',
        ar: 'يجب أن يحتوي اسم العمل على أحرف إنجليزية فقط'
      }
    })
    .optional(),

  registrationNumber: z.string()
    .length(10, {
      message: {
        en: 'Egyptian commercial registration number must be 10 digits',
        ar: 'يجب أن يكون رقم السجل التجاري المصري 10 أرقام'
      }
    })
    .regex(/^\d{10}$/, {
      message: {
        en: 'Invalid commercial registration number format',
        ar: 'صيغة رقم السجل التجاري غير صحيحة'
      }
    }),

  taxNumber: z.string()
    .length(9, {
      message: {
        en: 'Egyptian tax registration number must be 9 digits',
        ar: 'يجب أن يكون رقم التسجيل الضريبي المصري 9 أرقام'
      }
    })
    .regex(/^\d{9}$/, {
      message: {
        en: 'Invalid tax registration number format',
        ar: 'صيغة رقم التسجيل الضريبي غير صحيحة'
      }
    }),
});

/**
 * Validates user profile data with enhanced security checks
 * @param profileData - User profile data to validate
 * @returns Promise resolving to boolean indicating validation success
 * @throws ZodError with detailed bilingual messages if validation fails
 */
export async function validateUserProfile(profileData: Partial<User>): Promise<boolean> {
  try {
    await userProfileSchema.parseAsync(profileData);
    return true;
  } catch (error) {
    throw error;
  }
}

/**
 * Validates merchant profile data with business-specific validation
 * @param merchantData - Merchant profile data to validate
 * @returns Promise resolving to boolean indicating validation success
 * @throws ZodError with detailed bilingual messages if validation fails
 */
export async function validateMerchantProfile(merchantData: Partial<MerchantProfile>): Promise<boolean> {
  try {
    await merchantProfileSchema.parseAsync(merchantData);
    return true;
  } catch (error) {
    throw error;
  }
}