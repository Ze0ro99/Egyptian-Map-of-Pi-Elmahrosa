/**
 * @fileoverview Standardized error codes for the Egyptian Map of Pi platform
 * @version 1.0.0
 * 
 * This file defines all possible error codes that can be returned by the
 * Egyptian Map of Pi backend services. Error codes are organized into categories
 * with specific numeric ranges for easy identification and handling.
 * 
 * Error Code Ranges:
 * - 1000-1999: Authentication errors
 * - 2000-2999: Transaction errors
 * - 3000-3999: Data Validation errors
 * - 4000-4999: Network errors
 * - 5000-5999: System errors
 * - 6000-6999: Integration errors
 * - 7000-7999: Business Logic errors
 * - 8000-8999: Security errors
 */

/**
 * Enumeration of all possible error codes in the Egyptian Map of Pi system.
 * Using const enum for better performance and smaller bundle size in production.
 * Each error code is documented with its specific meaning and use case.
 */
export const enum ErrorCodes {
  // Authentication Errors (1000-1999)
  /** Invalid authentication token format or signature */
  AUTH_INVALID_TOKEN = 1001,
  /** Authentication token has expired */
  AUTH_EXPIRED_TOKEN = 1002,
  /** Required authentication token is missing */
  AUTH_MISSING_TOKEN = 1003,
  /** Provided authentication credentials are invalid */
  AUTH_INVALID_CREDENTIALS = 1004,
  /** KYC verification is required for this operation */
  AUTH_KYC_REQUIRED = 1005,

  // Transaction Errors (2000-2999)
  /** Insufficient Pi balance for the requested transaction */
  TRANSACTION_INSUFFICIENT_FUNDS = 2001,
  /** Invalid transaction amount specified */
  TRANSACTION_INVALID_AMOUNT = 2002,
  /** Transaction processing failed */
  TRANSACTION_FAILED = 2003,

  // Data Validation Errors (3000-3999)
  /** Input data validation failed */
  DATA_VALIDATION_FAILED = 3001,
  /** Requested resource not found */
  DATA_NOT_FOUND = 3002,

  // Network Errors (4000-4999)
  /** Network request failed */
  NETWORK_REQUEST_FAILED = 4001,
  /** Network request timed out */
  NETWORK_TIMEOUT = 4002,

  // System Errors (5000-5999)
  /** Internal server error */
  SYSTEM_INTERNAL_ERROR = 5001,
  /** Service is temporarily unavailable */
  SYSTEM_SERVICE_UNAVAILABLE = 5002,

  // Integration Errors (6000-6999)
  /** Error communicating with Pi Network services */
  INTEGRATION_PI_NETWORK_ERROR = 6001,
  /** Error communicating with Egyptian Maps service */
  INTEGRATION_MAPS_ERROR = 6002,

  // Business Logic Errors (7000-7999)
  /** Invalid product or service listing */
  BUSINESS_INVALID_LISTING = 7001,
  /** Merchant account not verified */
  BUSINESS_MERCHANT_NOT_VERIFIED = 7002,

  // Security Errors (8000-8999)
  /** API rate limit exceeded */
  SECURITY_RATE_LIMIT_EXCEEDED = 8001,
  /** Invalid access attempt detected */
  SECURITY_INVALID_ACCESS = 8002
}
```

This implementation follows all the specified requirements and best practices:

1. Uses TypeScript const enum for optimal performance and bundle size
2. Provides comprehensive documentation for the file and each error code
3. Organizes error codes into clear categories with specific numeric ranges
4. Includes detailed JSDoc comments explaining each error code's purpose
5. Follows the error code ranges specified in the technical specification
6. Exports the ErrorCodes enum for use across the platform
7. Maintains strict categorization based on error types
8. Provides clear, descriptive names for each error code
9. Implements all required error codes from the specification
10. Follows TypeScript best practices for constant enumerations

The error codes can be used throughout the application by importing the ErrorCodes enum:

```typescript
import { ErrorCodes } from '@shared/constants/error-codes';

// Example usage:
throw new Error(ErrorCodes.AUTH_INVALID_TOKEN.toString());