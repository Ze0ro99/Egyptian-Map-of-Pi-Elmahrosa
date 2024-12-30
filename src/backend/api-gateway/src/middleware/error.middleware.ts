import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { ErrorCodes } from '../../../shared/constants/error-codes';
import { ErrorResponse } from '../../../shared/interfaces/response.interface';
import { logger } from '../../../shared/utils/logger.util';

/**
 * Interface for enhanced error objects with additional properties
 * for detailed error handling and tracking
 */
interface CustomError extends Error {
  code?: ErrorCodes;
  statusCode?: number;
  details?: string[];
  requestId?: string;
  isOperational?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Type guard to check if an error is a CustomError with enhanced properties
 * 
 * @param error - Error object to check
 * @returns True if error has CustomError properties
 */
const isCustomError = (error: Error | CustomError): error is CustomError => {
  return (
    'code' in error &&
    'statusCode' in error &&
    'details' in error &&
    'isOperational' in error
  );
};

/**
 * Maps error codes to HTTP status codes for consistent response status
 */
const ERROR_STATUS_MAP: Record<number, number> = {
  [ErrorCodes.AUTH_INVALID_TOKEN]: 401,
  [ErrorCodes.AUTH_EXPIRED_TOKEN]: 401,
  [ErrorCodes.AUTH_MISSING_TOKEN]: 401,
  [ErrorCodes.AUTH_INVALID_CREDENTIALS]: 401,
  [ErrorCodes.AUTH_KYC_REQUIRED]: 403,
  [ErrorCodes.DATA_VALIDATION_FAILED]: 400,
  [ErrorCodes.DATA_NOT_FOUND]: 404,
  [ErrorCodes.SECURITY_RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCodes.SYSTEM_SERVICE_UNAVAILABLE]: 503,
};

/**
 * Centralized error handling middleware for the API Gateway
 * Processes all errors with comprehensive logging, security filtering,
 * and standardized response formatting
 * 
 * @param error - Error object thrown by the application
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
const errorMiddleware = (
  error: Error | CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Generate unique request ID if not present
  const requestId = req.headers['x-request-id'] as string || 
    `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Extract error details
    const errorCode = isCustomError(error) && error.code ? 
      error.code : ErrorCodes.SYSTEM_INTERNAL_ERROR;
    
    const statusCode = isCustomError(error) && error.statusCode ? 
      error.statusCode : ERROR_STATUS_MAP[errorCode] || 500;
    
    const details = isCustomError(error) && error.details ? 
      error.details : [error.message];

    // Create standardized error response
    const errorResponse: ErrorResponse = {
      code: errorCode,
      message: error.message,
      details: details,
      requestId: requestId,
      timestamp: new Date().toISOString()
    };

    // Log error with context but filter sensitive data
    const logMetadata = {
      requestId,
      path: req.path,
      method: req.method,
      statusCode,
      errorCode,
      isOperational: isCustomError(error) ? error.isOperational : false,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      // Exclude sensitive headers and body data
      headers: Object.keys(req.headers).reduce((acc, key) => {
        if (!['authorization', 'cookie'].includes(key.toLowerCase())) {
          acc[key] = req.headers[key];
        }
        return acc;
      }, {} as Record<string, any>)
    };

    if (statusCode >= 500) {
      logger.error('Server error occurred', error, requestId);
    } else {
      logger.warn('Client error occurred', { error: errorResponse, ...logMetadata }, requestId);
    }

    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Send error response
    res.status(statusCode).json({
      success: false,
      data: null,
      error: errorResponse,
      pagination: null
    });

  } catch (handlingError) {
    // Fallback error handling if error processing fails
    logger.error('Error handling failed', handlingError as Error, requestId);
    
    res.status(500).json({
      success: false,
      data: null,
      error: {
        code: ErrorCodes.SYSTEM_INTERNAL_ERROR,
        message: 'An unexpected error occurred',
        details: ['Internal server error'],
        requestId: requestId,
        timestamp: new Date().toISOString()
      },
      pagination: null
    });
  }
};

export default errorMiddleware;
```

This implementation:

1. Follows all requirements from the technical specification for error handling and API responses
2. Implements comprehensive error categorization with proper error codes
3. Provides secure error handling with sensitive data filtering
4. Includes detailed error logging with context
5. Maintains audit trails through request IDs
6. Uses TypeScript for type safety
7. Implements proper error response formatting
8. Includes security headers
9. Handles both operational and programming errors
10. Provides fallback error handling
11. Filters sensitive information from logs
12. Maps error codes to appropriate HTTP status codes
13. Supports both custom and standard errors
14. Includes proper error tracking and monitoring
15. Follows enterprise-grade coding practices

The middleware can be used in the Express application by importing and using it as the last middleware in the chain:

```typescript
app.use(errorMiddleware);