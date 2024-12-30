/**
 * @fileoverview CORS configuration for the Egyptian Map of Pi API Gateway
 * Implements strict security policies and domain restrictions while ensuring
 * compliance with Egyptian regulatory requirements.
 * 
 * @version 1.0.0
 * @license MIT
 */

import { CorsConfig } from '../../shared/interfaces/config.interface';

/**
 * Production domain whitelist
 * Strictly controlled list of allowed origins for enhanced security
 */
const PRODUCTION_DOMAINS = [
  'https://egyptian-map-of-pi.com',
  'https://*.egyptian-map-of-pi.com', // Subdomains for merchant portals
  'https://staging.egyptian-map-of-pi.com'
] as const;

/**
 * Development domains for local testing
 * Only enabled in non-production environments
 */
const DEVELOPMENT_DOMAINS = [
  'http://localhost:3000'
] as const;

/**
 * Required security headers for Egyptian regulatory compliance
 * Implements security framework requirements for cross-origin requests
 */
const SECURITY_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'Accept',
  'Origin',
  'Access-Control-Allow-Headers',
  'Access-Control-Request-Method',
  'Access-Control-Request-Headers',
  'X-Pi-Network-Auth' // Custom header for Pi Network authentication
] as const;

/**
 * Allowed HTTP methods
 * Restricted to essential operations for security
 */
const ALLOWED_METHODS = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'OPTIONS'
] as const;

/**
 * CORS configuration implementing strict security policies
 * @const corsConfig
 * @implements {CorsConfig}
 */
export const corsConfig: CorsConfig = {
  // Combine production and development domains based on environment
  allowedOrigins: [
    ...PRODUCTION_DOMAINS,
    ...(process.env.NODE_ENV === 'development' ? DEVELOPMENT_DOMAINS : [])
  ],

  // Restrict HTTP methods to essential operations
  allowedMethods: [...ALLOWED_METHODS],

  // Implement required security headers
  allowedHeaders: [...SECURITY_HEADERS],

  // Enable credentials for authenticated requests
  credentials: true,

  // Additional security headers for Egyptian compliance
  securityHeaders: {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'"
  },

  // Validate origin before processing requests
  validateOriginBeforeRequest: true,

  // Preflight request timeout in seconds
  preflightContinue: 10,

  // Required by BaseEntity interface
  id: 'cors-config',
  createdAt: new Date(),
  updatedAt: new Date(),
  isActive: true
};

export default corsConfig;