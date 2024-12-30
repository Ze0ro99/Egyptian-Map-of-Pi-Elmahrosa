/**
 * @fileoverview Rate limiting configuration for the Egyptian Map of Pi API Gateway
 * Implements granular rate limits for different API endpoints to ensure fair usage
 * and prevent abuse while maintaining platform stability and security.
 * 
 * Rate limits are defined per minute as specified in the technical requirements:
 * - Public Listings: 100 requests/minute
 * - User Operations: 60 requests/minute
 * - Transactions: 30 requests/minute
 * - Search/Filter: 120 requests/minute
 * - Messages: 200 requests/minute
 */

import { RateLimitConfig } from '../../../shared/interfaces/config.interface';
import rateLimit from 'express-rate-limit'; // v6.9.0

/**
 * One minute in milliseconds - base time window for rate limiting
 */
const ONE_MINUTE = 60 * 1000;

/**
 * Comprehensive rate limiting configuration for different API endpoints
 * Implements security controls and API specifications from technical requirements
 */
export const rateLimitConfig: Record<string, RateLimitConfig> = {
  /**
   * Rate limits for public listing endpoints
   * Allows 100 requests per minute as per API specifications
   */
  publicListings: {
    windowMs: ONE_MINUTE,
    maxRequests: 100,
    enabled: true,
    skipSuccessfulRequests: false,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    whitelistedIPs: [], // No IP exemptions by default
    enableIpTracking: true,
    customLimits: {},
    responseHeaders: {
      'Retry-After': 'RateLimit-Reset'
    }
  },

  /**
   * Rate limits for user operations endpoints
   * Allows 60 requests per minute for user-related operations
   */
  userOperations: {
    windowMs: ONE_MINUTE,
    maxRequests: 60,
    enabled: true,
    skipSuccessfulRequests: false,
    standardHeaders: true,
    legacyHeaders: false,
    whitelistedIPs: [],
    enableIpTracking: true,
    customLimits: {},
    responseHeaders: {
      'Retry-After': 'RateLimit-Reset'
    }
  },

  /**
   * Rate limits for transaction endpoints
   * Restricted to 30 requests per minute due to sensitive nature
   */
  transactions: {
    windowMs: ONE_MINUTE,
    maxRequests: 30,
    enabled: true,
    skipSuccessfulRequests: false,
    standardHeaders: true,
    legacyHeaders: false,
    whitelistedIPs: [],
    enableIpTracking: true,
    customLimits: {},
    responseHeaders: {
      'Retry-After': 'RateLimit-Reset'
    }
  },

  /**
   * Rate limits for search and filter endpoints
   * Allows 120 requests per minute to support interactive search
   */
  search: {
    windowMs: ONE_MINUTE,
    maxRequests: 120,
    enabled: true,
    skipSuccessfulRequests: false,
    standardHeaders: true,
    legacyHeaders: false,
    whitelistedIPs: [],
    enableIpTracking: true,
    customLimits: {},
    responseHeaders: {
      'Retry-After': 'RateLimit-Reset'
    }
  },

  /**
   * Rate limits for messaging endpoints
   * Allows 200 requests per minute to support real-time communication
   */
  messages: {
    windowMs: ONE_MINUTE,
    maxRequests: 200,
    enabled: true,
    skipSuccessfulRequests: false,
    standardHeaders: true,
    legacyHeaders: false,
    whitelistedIPs: [],
    enableIpTracking: true,
    customLimits: {},
    responseHeaders: {
      'Retry-After': 'RateLimit-Reset'
    }
  }
};

/**
 * Factory function to create rate limiter middleware for specific endpoint categories
 * @param category - The endpoint category to create rate limiter for
 * @returns Configured rate limiter middleware
 */
export const createRateLimiter = (category: keyof typeof rateLimitConfig) => {
  const config = rateLimitConfig[category];
  return rateLimit({
    windowMs: config.windowMs,
    max: config.maxRequests,
    standardHeaders: config.standardHeaders,
    legacyHeaders: config.legacyHeaders,
    skipSuccessfulRequests: config.skipSuccessfulRequests,
    message: {
      status: 429,
      message: 'Too many requests, please try again later.',
      category: category
    }
  });
};