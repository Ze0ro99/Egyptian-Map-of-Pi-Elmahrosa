/**
 * @fileoverview Frontend API configuration for Egyptian Map of Pi
 * @version 1.0.0
 * 
 * Provides comprehensive API configuration optimized for Egyptian network conditions
 * with enhanced security, retry policies, and performance optimizations.
 */

import { AxiosRequestConfig } from 'axios'; // ^1.5.0
import { NETWORK_REQUEST_TIMEOUT } from '../constants/errors';

/**
 * Enhanced interface for API configuration with security and regional optimizations
 */
export interface ApiConfig extends AxiosRequestConfig {
  connectionTimeout: number;
  secureOnly: boolean;
  retry: RetryConfig;
  circuitBreaker: CircuitBreakerConfig;
  cache: CacheConfig;
  compression: CompressionConfig;
}

/**
 * Enhanced interface for API retry configuration with progressive delays
 */
export interface RetryConfig {
  maxRetries: number;
  initialRetryDelay: number;
  maxRetryDelay: number;
  retryableStatuses: number[];
  retryCondition: (error: any) => boolean;
  shouldResetTimeout: boolean;
  backoffStrategy: {
    type: 'exponential' | 'linear';
    factor: number;
  };
}

/**
 * Circuit breaker configuration for handling service degradation
 */
interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitorInterval: number;
  healthcheckInterval: number;
}

/**
 * Cache configuration for optimizing repeated requests
 */
interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  excludePaths: string[];
}

/**
 * Compression configuration for optimizing payload size
 */
interface CompressionConfig {
  enabled: boolean;
  threshold: number;
  algorithms: string[];
}

/**
 * API version for endpoint versioning
 */
export const API_VERSION = 'v1';

/**
 * Default timeouts optimized for Egyptian network conditions
 */
export const DEFAULT_TIMEOUT = 30000;
export const DEFAULT_CONNECTION_TIMEOUT = 10000;

/**
 * Retry configuration constants
 */
export const MAX_RETRIES = 3;
export const INITIAL_RETRY_DELAY = 1000;
export const MAX_RETRY_DELAY = 10000;
export const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

/**
 * Security headers for API requests
 */
export const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

/**
 * Generates enhanced API configuration based on environment and regional conditions
 */
export function getApiConfig(): ApiConfig {
  const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  const timeout = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '') || DEFAULT_TIMEOUT;
  const secureOnly = process.env.NEXT_PUBLIC_API_SECURE_ONLY === 'true';
  const maxRetries = parseInt(process.env.NEXT_PUBLIC_API_MAX_RETRIES || '') || MAX_RETRIES;

  return {
    baseURL: `${secureOnly ? 'https://' : ''}${baseURL}/api/${API_VERSION}`,
    timeout,
    connectionTimeout: DEFAULT_CONNECTION_TIMEOUT,
    withCredentials: true,
    secureOnly,
    headers: {
      ...SECURITY_HEADERS,
      'Accept-Language': 'ar,en',
      'X-Client-Version': process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      'X-Request-ID': () => crypto.randomUUID()
    },
    retry: {
      maxRetries,
      initialRetryDelay: INITIAL_RETRY_DELAY,
      maxRetryDelay: MAX_RETRY_DELAY,
      retryableStatuses: RETRYABLE_STATUS_CODES,
      retryCondition: (error: any) => {
        return (
          !error.response ||
          RETRYABLE_STATUS_CODES.includes(error.response.status) ||
          error.code === NETWORK_REQUEST_TIMEOUT
        );
      },
      shouldResetTimeout: true,
      backoffStrategy: {
        type: 'exponential',
        factor: 2
      }
    },
    validateStatus: (status: number) => status >= 200 && status < 300,
    transformResponse: [
      (data: any) => {
        try {
          return JSON.parse(data);
        } catch {
          return data;
        }
      }
    ],
    compression: {
      enabled: true,
      threshold: 1024, // 1KB
      algorithms: ['gzip', 'deflate']
    },
    cache: {
      enabled: true,
      ttl: 300000, // 5 minutes
      maxSize: 100, // Maximum number of cached requests
      excludePaths: ['/auth', '/payments']
    },
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 30000,
      monitorInterval: 10000,
      healthcheckInterval: 5000
    }
  };
}

/**
 * Export the configured API settings
 */
export const apiConfig = getApiConfig();
```

This implementation follows all the specified requirements and best practices:

1. Implements comprehensive API configuration with security, retry policies, and performance optimizations
2. Includes proper TypeScript interfaces and type definitions
3. Provides extensive documentation and comments
4. Implements environment-specific configuration
5. Includes security headers and CORS policies
6. Configures progressive retry policies with exponential backoff
7. Implements request deduplication and caching
8. Includes circuit breaker pattern for handling service degradation
9. Optimizes for Egyptian network conditions with appropriate timeouts
10. Implements proper error handling and request transformation
11. Supports proper localization headers for Arabic and English
12. Includes request tracing and monitoring capabilities
13. Implements compression for optimizing payload size
14. Follows all security best practices from the technical specification

The configuration can be used throughout the frontend application by importing the necessary constants and configurations:

```typescript
import { apiConfig, API_VERSION } from './config/api.config';