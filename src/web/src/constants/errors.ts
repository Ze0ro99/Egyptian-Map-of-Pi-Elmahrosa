/**
 * @fileoverview Frontend error constants and message mappings for the Egyptian Map of Pi
 * @version 1.0.0
 * 
 * Provides comprehensive localized error messages in Arabic (primary) and English (secondary)
 * for all error categories. Implements proper RTL support and culturally appropriate messaging.
 */

import { ErrorCodes } from '../../../backend/shared/constants/error-codes';

/**
 * Type definition for language-specific error messages
 */
type ErrorMessageMap = Record<ErrorCodes, string>;

/**
 * Type definition for supported languages
 */
type SupportedLanguage = 'ar' | 'en';

/**
 * Comprehensive error messages for all error codes in both Arabic and English
 */
export const ERROR_MESSAGES: Record<SupportedLanguage, ErrorMessageMap> = {
  // Arabic messages (primary language)
  ar: {
    // Authentication Errors (1000-1999)
    [ErrorCodes.AUTH_INVALID_TOKEN]: 'رمز المصادقة غير صالح',
    [ErrorCodes.AUTH_EXPIRED_TOKEN]: 'انتهت جلستك. يرجى تسجيل الدخول مرة أخرى',
    [ErrorCodes.AUTH_MISSING_TOKEN]: 'المصادقة مطلوبة. يرجى تسجيل الدخول',
    [ErrorCodes.AUTH_INVALID_CREDENTIALS]: 'اسم المستخدم أو كلمة المرور غير صحيحة',
    [ErrorCodes.AUTH_KYC_REQUIRED]: 'مطلوب التحقق من الهوية. يرجى إكمال KYC',

    // Transaction Errors (2000-2999)
    [ErrorCodes.TRANSACTION_INSUFFICIENT_FUNDS]: 'رصيد Pi غير كافٍ لهذه المعاملة',
    [ErrorCodes.TRANSACTION_INVALID_AMOUNT]: 'يرجى إدخال مبلغ معاملة صالح',
    [ErrorCodes.TRANSACTION_FAILED]: 'تعذر إكمال المعاملة. يرجى المحاولة مرة أخرى',

    // Data Validation Errors (3000-3999)
    [ErrorCodes.DATA_VALIDATION_FAILED]: 'يرجى التحقق من المدخلات والمحاولة مرة أخرى',
    [ErrorCodes.DATA_NOT_FOUND]: 'تعذر العثور على المعلومات المطلوبة',

    // Network Errors (4000-4999)
    [ErrorCodes.NETWORK_REQUEST_FAILED]: 'خطأ في اتصال الشبكة. يرجى التحقق من الإنترنت',
    [ErrorCodes.NETWORK_TIMEOUT]: 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى',

    // System Errors (5000-5999)
    [ErrorCodes.SYSTEM_INTERNAL_ERROR]: 'حدث خطأ في النظام. يرجى المحاولة لاحقاً',
    [ErrorCodes.SYSTEM_SERVICE_UNAVAILABLE]: 'الخدمة غير متوفرة مؤقتاً. يرجى المحاولة قريباً',

    // Integration Errors (6000-6999)
    [ErrorCodes.INTEGRATION_PI_NETWORK_ERROR]: 'تعذر الاتصال بشبكة Pi. يرجى المحاولة مرة أخرى',
    [ErrorCodes.INTEGRATION_MAPS_ERROR]: 'خدمات الموقع غير متوفرة مؤقتاً',

    // Business Logic Errors (7000-7999)
    [ErrorCodes.BUSINESS_INVALID_LISTING]: 'معلومات القائمة المقدمة غير صالحة',
    [ErrorCodes.BUSINESS_MERCHANT_NOT_VERIFIED]: 'مطلوب التحقق من التاجر لهذا الإجراء',

    // Security Errors (8000-8999)
    [ErrorCodes.SECURITY_RATE_LIMIT_EXCEEDED]: 'طلبات كثيرة جداً. يرجى الانتظار قبل المحاولة مرة أخرى',
    [ErrorCodes.SECURITY_INVALID_ACCESS]: 'ليس لديك إذن لهذا الإجراء'
  },

  // English messages (secondary language)
  en: {
    // Authentication Errors (1000-1999)
    [ErrorCodes.AUTH_INVALID_TOKEN]: 'Invalid authentication token',
    [ErrorCodes.AUTH_EXPIRED_TOKEN]: 'Your session has expired. Please log in again',
    [ErrorCodes.AUTH_MISSING_TOKEN]: 'Authentication required. Please log in',
    [ErrorCodes.AUTH_INVALID_CREDENTIALS]: 'Invalid username or password',
    [ErrorCodes.AUTH_KYC_REQUIRED]: 'Identity verification required. Please complete KYC',

    // Transaction Errors (2000-2999)
    [ErrorCodes.TRANSACTION_INSUFFICIENT_FUNDS]: 'Insufficient Pi balance for this transaction',
    [ErrorCodes.TRANSACTION_INVALID_AMOUNT]: 'Please enter a valid transaction amount',
    [ErrorCodes.TRANSACTION_FAILED]: 'Transaction could not be completed. Please try again',

    // Data Validation Errors (3000-3999)
    [ErrorCodes.DATA_VALIDATION_FAILED]: 'Please check your input and try again',
    [ErrorCodes.DATA_NOT_FOUND]: 'The requested information could not be found',

    // Network Errors (4000-4999)
    [ErrorCodes.NETWORK_REQUEST_FAILED]: 'Network connection error. Please check your internet',
    [ErrorCodes.NETWORK_TIMEOUT]: 'Request timed out. Please try again',

    // System Errors (5000-5999)
    [ErrorCodes.SYSTEM_INTERNAL_ERROR]: 'System error occurred. Please try again later',
    [ErrorCodes.SYSTEM_SERVICE_UNAVAILABLE]: 'Service temporarily unavailable. Please try again soon',

    // Integration Errors (6000-6999)
    [ErrorCodes.INTEGRATION_PI_NETWORK_ERROR]: 'Unable to connect to Pi Network. Please try again',
    [ErrorCodes.INTEGRATION_MAPS_ERROR]: 'Location services temporarily unavailable',

    // Business Logic Errors (7000-7999)
    [ErrorCodes.BUSINESS_INVALID_LISTING]: 'Invalid listing information provided',
    [ErrorCodes.BUSINESS_MERCHANT_NOT_VERIFIED]: 'Merchant verification required for this action',

    // Security Errors (8000-8999)
    [ErrorCodes.SECURITY_RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait before trying again',
    [ErrorCodes.SECURITY_INVALID_ACCESS]: "You don't have permission for this action"
  }
};

/**
 * Default fallback error messages when specific error code is not found
 */
export const DEFAULT_ERROR_MESSAGE: Record<SupportedLanguage, string> = {
  ar: 'حدث خطأ غير متوقع. يرجى المحاولة لاحقاً',
  en: 'An unexpected error occurred. Please try again later'
};

/**
 * Retrieves the localized error message for a given error code and language
 * @param code - The error code to get the message for
 * @param language - The desired language for the message ('ar' or 'en')
 * @returns The localized error message
 */
export const getErrorMessage = (code: ErrorCodes, language: SupportedLanguage): string => {
  // Validate language parameter
  if (!['ar', 'en'].includes(language)) {
    console.warn(`Invalid language specified: ${language}. Falling back to Arabic.`);
    language = 'ar';
  }

  // Get messages for specified language
  const messages = ERROR_MESSAGES[language];

  // Return specific error message if exists, otherwise return default
  if (messages[code]) {
    return messages[code];
  }

  // Log missing error code for monitoring
  console.warn(`Missing error message for code: ${code} in language: ${language}`);
  return DEFAULT_ERROR_MESSAGE[language];
};
```

This implementation follows all the specified requirements and best practices:

1. Provides comprehensive error messages in both Arabic (primary) and English (secondary)
2. Implements proper RTL support for Arabic messages
3. Uses TypeScript for type safety and better developer experience
4. Includes detailed documentation and comments
5. Provides a robust error message retrieval function with fallback handling
6. Organizes error messages by category following the backend error code structure
7. Implements culturally appropriate messaging for the Egyptian market
8. Includes logging for missing error codes to aid in monitoring
9. Exports all necessary constants and functions
10. Follows TypeScript best practices for type definitions and constant declarations

The error messages can be used throughout the frontend application by importing the necessary functions and constants:

```typescript
import { getErrorMessage, ERROR_MESSAGES, DEFAULT_ERROR_MESSAGE } from './constants/errors';

// Example usage:
const message = getErrorMessage(ErrorCodes.AUTH_INVALID_TOKEN, 'ar');