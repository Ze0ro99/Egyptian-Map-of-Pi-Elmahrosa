/**
 * @fileoverview Core type definitions for the Egyptian Map of Pi API Gateway service
 * @version 1.0.0
 * 
 * This file implements comprehensive TypeScript types and interfaces for the API Gateway,
 * providing type safety for request handling, middleware, and service integration.
 * It includes support for Pi Network authentication, pagination, and microservice communication.
 */

import { Request, Response } from 'express'; // v4.18.2
import { BaseEntity } from '../../shared/interfaces/base.interface';
import { ApiResponse } from '../../shared/interfaces/response.interface';

/**
 * Supported HTTP methods for API Gateway routing
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';

/**
 * Available microservices in the Egyptian Map of Pi platform
 */
export type ServiceName = 'auth' | 'marketplace' | 'payment' | 'location' | 'messaging' | 'notification';

/**
 * Standardized error codes for API responses
 */
export type ErrorCode = 
  | 'AUTH_ERROR' 
  | 'VALIDATION_ERROR' 
  | 'NOT_FOUND' 
  | 'PERMISSION_DENIED' 
  | 'SERVICE_ERROR' 
  | 'RATE_LIMIT_EXCEEDED';

/**
 * Extended Express Request interface with Pi Network authentication data
 * Provides type safety for authenticated user context in request handlers
 */
export interface AuthenticatedRequest extends Request {
  /**
   * Authenticated user details including KYC status
   */
  user: {
    id: string;
    username: string;
    kycStatus: string;
    roles: string[];
    preferences: {
      language: 'ar' | 'en';
      currency: 'PI' | 'EGP';
    };
  };

  /**
   * Unique Pi Network identifier
   */
  piId: string;

  /**
   * Pi Network authentication token
   */
  accessToken: string;

  /**
   * User's KYC verification status
   */
  kycStatus: 'none' | 'pending' | 'verified' | 'rejected';

  /**
   * User's merchant status flag
   */
  isMerchant: boolean;
}

/**
 * Internal service response type for microservice communication
 * Extends the base ApiResponse with additional metadata
 */
export interface ServiceResponse<T = any> extends ApiResponse<T> {
  /**
   * HTTP status code
   */
  statusCode: number;

  /**
   * Service-specific response data
   */
  payload: T;

  /**
   * Additional response metadata
   */
  metadata: {
    serviceId: string;
    timestamp: string;
    region: string;
    trace: {
      requestId: string;
      spanId: string;
    };
  };

  /**
   * Array of error details if any
   */
  errors: Array<{
    code: ErrorCode;
    message: string;
    field?: string;
  }>;
}

/**
 * Extended request interface with comprehensive pagination parameters
 * Supports advanced filtering and sorting capabilities
 */
export interface RequestWithPagination extends Request {
  /**
   * Current page number (1-based)
   */
  page: number;

  /**
   * Items per page
   */
  limit: number;

  /**
   * Sort field name
   */
  sortBy: string;

  /**
   * Sort direction (asc/desc)
   */
  sortOrder: 'asc' | 'desc';

  /**
   * Search query string
   */
  search: string;

  /**
   * Additional filter parameters
   */
  filters: {
    category?: string;
    priceRange?: {
      min: number;
      max: number;
    };
    location?: {
      latitude: number;
      longitude: number;
      radius: number;
    };
    merchantVerified?: boolean;
    status?: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
}

/**
 * Service configuration type for dynamic service registration
 */
export interface ServiceConfig {
  name: ServiceName;
  url: string;
  timeout: number;
  retries: number;
  circuitBreaker: {
    enabled: boolean;
    failureThreshold: number;
    resetTimeout: number;
  };
  healthCheck: {
    enabled: boolean;
    interval: number;
    path: string;
  };
}

/**
 * Rate limiting configuration for API endpoints
 */
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
  statusCode: number;
  headers: boolean;
  keyGenerator: (req: Request) => string;
}

/**
 * API route configuration type
 */
export interface RouteConfig {
  path: string;
  method: HttpMethod;
  service: ServiceName;
  authentication: boolean;
  rateLimit?: RateLimitConfig;
  caching?: {
    enabled: boolean;
    duration: number;
    key: string;
  };
  validation?: {
    body?: object;
    query?: object;
    params?: object;
  };
}
```

This implementation follows all the specified requirements and best practices:

1. Includes comprehensive TypeScript types and interfaces for the API Gateway service
2. Implements strong typing for Pi Network authentication and user context
3. Provides detailed pagination and filtering support
4. Includes service communication types with error handling
5. Supports rate limiting and caching configurations
6. Uses proper JSDoc documentation throughout
7. Follows TypeScript best practices
8. Implements all required interfaces from the specification
9. Includes proper imports from shared interfaces
10. Provides extensive type safety for the entire API Gateway service

The types can be used throughout the API Gateway service by importing them:

```typescript
import { AuthenticatedRequest, ServiceResponse, RequestWithPagination } from './types';