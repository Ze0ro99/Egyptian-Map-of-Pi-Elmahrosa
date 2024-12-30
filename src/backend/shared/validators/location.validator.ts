/**
 * @fileoverview Location data validator for Egyptian Map of Pi platform
 * Implements comprehensive validation for coordinates, addresses, and location types
 * with support for Egyptian geographic standards and bilingual requirements.
 * @version 1.0.0
 */

import Joi from 'joi'; // v17.9.0
import { Location, Coordinates, LocationType } from '../../location-service/src/interfaces/location.interface';
import { ErrorCodes } from '../constants/error-codes';

/**
 * Constants for Egyptian geographic boundaries and validation
 */
const EGYPT_BOUNDS = {
  LAT_MIN: 22.0,
  LAT_MAX: 31.5,
  LNG_MIN: 25.0,
  LNG_MAX: 35.5,
  MAX_ACCURACY_METERS: 100
};

/**
 * Valid Egyptian governorates in both English and Arabic
 */
const EGYPTIAN_GOVERNORATES = {
  en: [
    'Cairo', 'Alexandria', 'Giza', 'Qalyubia', 'Port Said', 'Suez', 'Luxor',
    'Aswan', 'Ismailia', 'Damietta', 'Dakahlia', 'Sharqia', 'Menoufia',
    'Gharbia', 'Kafr El Sheikh', 'Beheira', 'Matruh', 'Red Sea', 'North Sinai',
    'South Sinai', 'Fayoum', 'Beni Suef', 'Minya', 'Asyut', 'Sohag', 'Qena',
    'New Valley'
  ],
  ar: [
    'القاهرة', 'الإسكندرية', 'الجيزة', 'القليوبية', 'بورسعيد', 'السويس', 'الأقصر',
    'أسوان', 'الإسماعيلية', 'دمياط', 'الدقهلية', 'الشرقية', 'المنوفية',
    'الغربية', 'كفر الشيخ', 'البحيرة', 'مطروح', 'البحر الأحمر', 'شمال سيناء',
    'جنوب سيناء', 'الفيوم', 'بني سويف', 'المنيا', 'أسيوط', 'سوهاج', 'قنا',
    'الوادي الجديد'
  ]
};

/**
 * Regular expression for Egyptian postal codes
 */
const POSTAL_CODE_REGEX = /^\d{5}$/;

/**
 * Interface for validation result
 */
interface ValidationResult {
  isValid: boolean;
  errorCode?: ErrorCodes;
  errorMessage?: {
    en: string;
    ar: string;
  };
}

/**
 * Validates geographic coordinates within Egypt's boundaries
 * @param coordinates - The coordinates to validate
 * @returns Validation result with status and any error messages
 */
export const validateCoordinates = (coordinates: Coordinates): ValidationResult => {
  if (!coordinates || typeof coordinates.latitude !== 'number' || typeof coordinates.longitude !== 'number') {
    return {
      isValid: false,
      errorCode: ErrorCodes.DATA_VALIDATION_FAILED,
      errorMessage: {
        en: 'Invalid coordinate format',
        ar: 'تنسيق إحداثيات غير صالح'
      }
    };
  }

  const { latitude, longitude, accuracy } = coordinates;

  // Validate coordinates are within Egypt's boundaries
  if (latitude < EGYPT_BOUNDS.LAT_MIN || latitude > EGYPT_BOUNDS.LAT_MAX ||
      longitude < EGYPT_BOUNDS.LNG_MIN || longitude > EGYPT_BOUNDS.LNG_MAX) {
    return {
      isValid: false,
      errorCode: ErrorCodes.DATA_VALIDATION_FAILED,
      errorMessage: {
        en: 'Coordinates must be within Egyptian boundaries',
        ar: 'يجب أن تكون الإحداثيات داخل الحدود المصرية'
      }
    };
  }

  // Validate accuracy
  if (accuracy > EGYPT_BOUNDS.MAX_ACCURACY_METERS) {
    return {
      isValid: false,
      errorCode: ErrorCodes.DATA_VALIDATION_FAILED,
      errorMessage: {
        en: 'Location accuracy must be within 100 meters',
        ar: 'يجب أن تكون دقة الموقع في حدود 100 متر'
      }
    };
  }

  return { isValid: true };
};

/**
 * Validates Egyptian address format and components
 * @param address - The address to validate
 * @returns Validation result with status and any error messages
 */
export const validateAddress = (address: any): ValidationResult => {
  if (!address || typeof address !== 'object') {
    return {
      isValid: false,
      errorCode: ErrorCodes.DATA_VALIDATION_FAILED,
      errorMessage: {
        en: 'Invalid address format',
        ar: 'تنسيق العنوان غير صالح'
      }
    };
  }

  // Validate postal code
  if (!POSTAL_CODE_REGEX.test(address.postalCode)) {
    return {
      isValid: false,
      errorCode: ErrorCodes.INVALID_POSTAL_CODE,
      errorMessage: {
        en: 'Invalid Egyptian postal code format',
        ar: 'تنسيق الرمز البريدي المصري غير صالح'
      }
    };
  }

  // Validate governorate names
  if (!EGYPTIAN_GOVERNORATES.en.includes(address.governorateEn) ||
      !EGYPTIAN_GOVERNORATES.ar.includes(address.governorateAr)) {
    return {
      isValid: false,
      errorCode: ErrorCodes.DATA_VALIDATION_FAILED,
      errorMessage: {
        en: 'Invalid governorate name',
        ar: 'اسم المحافظة غير صالح'
      }
    };
  }

  // Validate required address fields
  const requiredFields = ['streetAr', 'streetEn', 'cityAr', 'cityEn'];
  for (const field of requiredFields) {
    if (!address[field] || typeof address[field] !== 'string' || !address[field].trim()) {
      return {
        isValid: false,
        errorCode: ErrorCodes.DATA_VALIDATION_FAILED,
        errorMessage: {
          en: `Missing or invalid ${field} field`,
          ar: `حقل ${field} مفقود أو غير صالح`
        }
      };
    }
  }

  return { isValid: true };
};

/**
 * Joi schema for location validation
 */
export const locationSchema = Joi.object({
  coordinates: Joi.object({
    latitude: Joi.number()
      .min(EGYPT_BOUNDS.LAT_MIN)
      .max(EGYPT_BOUNDS.LAT_MAX)
      .required()
      .messages({
        'number.base': 'Latitude must be a number',
        'number.min': 'Latitude must be within Egyptian boundaries',
        'number.max': 'Latitude must be within Egyptian boundaries'
      }),
    longitude: Joi.number()
      .min(EGYPT_BOUNDS.LNG_MIN)
      .max(EGYPT_BOUNDS.LNG_MAX)
      .required()
      .messages({
        'number.base': 'Longitude must be a number',
        'number.min': 'Longitude must be within Egyptian boundaries',
        'number.max': 'Longitude must be within Egyptian boundaries'
      }),
    accuracy: Joi.number()
      .max(EGYPT_BOUNDS.MAX_ACCURACY_METERS)
      .required()
      .messages({
        'number.max': 'Location accuracy must be within 100 meters'
      })
  }).required(),
  address: Joi.object({
    streetAr: Joi.string().required(),
    streetEn: Joi.string().required(),
    cityAr: Joi.string().required(),
    cityEn: Joi.string().required(),
    governorateAr: Joi.string()
      .valid(...EGYPTIAN_GOVERNORATES.ar)
      .required(),
    governorateEn: Joi.string()
      .valid(...EGYPTIAN_GOVERNORATES.en)
      .required(),
    postalCode: Joi.string()
      .pattern(POSTAL_CODE_REGEX)
      .required()
      .messages({
        'string.pattern.base': 'Invalid Egyptian postal code format'
      })
  }).required(),
  type: Joi.string()
    .valid(...Object.values(LocationType))
    .required()
    .messages({
      'any.only': 'Invalid location type'
    })
}).required();