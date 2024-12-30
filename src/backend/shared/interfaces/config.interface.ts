/**
 * @fileoverview Defines comprehensive configuration interfaces for the Egyptian Map of Pi backend services.
 * Implements robust security, performance, and compliance features for system components including
 * CORS, rate limiting, authentication, caching, and database connections.
 */

import { BaseEntity } from './base.interface';

/**
 * Enhanced CORS configuration interface with security headers and validation patterns
 * Implements security framework requirements for cross-origin resource sharing
 * 
 * @interface CorsConfig
 * @extends {BaseEntity}
 */
export interface CorsConfig extends BaseEntity {
  /**
   * List of allowed origins for CORS requests
   * Must include Pi Network domains and verified Egyptian merchant domains
   */
  allowedOrigins: string[];

  /**
   * Allowed HTTP methods for CORS requests
   * Default: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
   */
  allowedMethods: string[];

  /**
   * Allowed headers for CORS requests
   * Includes security and authentication headers
   */
  allowedHeaders: string[];

  /**
   * Whether to allow credentials in CORS requests
   */
  credentials: boolean;

  /**
   * Custom security headers to be included in responses
   * Implements security framework requirements
   */
  securityHeaders: Record<string, string>;

  /**
   * Whether to validate origin before processing request
   * Enhanced security feature for Egyptian market
   */
  validateOriginBeforeRequest: boolean;

  /**
   * Whether to continue after preflight request
   * Controls preflight request behavior
   */
  preflightContinue: number;
}

/**
 * Advanced rate limiting configuration with IP tracking and bypass options
 * Implements API specifications for request throttling
 * 
 * @interface RateLimitConfig
 * @extends {BaseEntity}
 */
export interface RateLimitConfig extends BaseEntity {
  /**
   * Time window for rate limiting in milliseconds
   */
  windowMs: number;

  /**
   * Maximum number of requests allowed within window
   */
  maxRequests: number;

  /**
   * Whether rate limiting is enabled
   */
  enabled: boolean;

  /**
   * IP addresses exempt from rate limiting
   */
  whitelistedIPs: string[];

  /**
   * Whether to enable IP tracking for rate limiting
   */
  enableIpTracking: boolean;

  /**
   * Custom rate limits for specific routes or IPs
   */
  customLimits: Record<string, number>;

  /**
   * Headers to include in rate limit responses
   */
  responseHeaders: Record<string, string>;
}

/**
 * Enhanced caching configuration with key generation and invalidation rules
 * Implements performance optimization requirements
 * 
 * @interface CacheConfig
 * @extends {BaseEntity}
 */
export interface CacheConfig extends BaseEntity {
  /**
   * Time-to-live for cached items in seconds
   */
  ttl: number;

  /**
   * Whether caching is enabled
   */
  enabled: boolean;

  /**
   * Strategy for generating cache keys
   */
  keyGenerationStrategy: string;

  /**
   * Rules for cache invalidation
   */
  invalidationRules: Record<string, number>;

  /**
   * Whether to enable compression for cached data
   */
  enableCompression: boolean;

  /**
   * Minimum size in bytes for compression
   */
  compressionThreshold: number;
}

/**
 * Comprehensive authentication configuration with multi-factor and session management
 * Implements security framework requirements for user authentication
 * 
 * @interface AuthConfig
 * @extends {BaseEntity}
 */
export interface AuthConfig extends BaseEntity {
  /**
   * Secret key for JWT token generation
   */
  jwtSecret: string;

  /**
   * JWT token expiration time
   */
  jwtExpiresIn: string;

  /**
   * Pi Network API key for integration
   */
  piNetworkApiKey: string;

  /**
   * Secret key for refresh token generation
   */
  refreshTokenSecret: string;

  /**
   * Refresh token expiration time in seconds
   */
  refreshTokenExpiresIn: number;

  /**
   * Whether to enable multi-factor authentication
   */
  enableMfa: boolean;

  /**
   * Multi-factor authentication options
   */
  mfaOptions: Record<string, any>;

  /**
   * Session management configuration
   */
  sessionConfig: Record<string, any>;
}

/**
 * Extended database configuration with connection pooling and encryption
 * Implements system component requirements for data storage
 * 
 * @interface DatabaseConfig
 * @extends {BaseEntity}
 */
export interface DatabaseConfig extends BaseEntity {
  /**
   * MongoDB connection URI
   */
  uri: string;

  /**
   * MongoDB connection options
   */
  options: Record<string, any>;

  /**
   * Connection pool configuration
   */
  poolConfig: Record<string, number>;

  /**
   * Replica set configuration for high availability
   */
  replicaSetConfig: Record<string, any>;

  /**
   * Database encryption configuration
   */
  encryptionConfig: Record<string, any>;

  /**
   * Database monitoring configuration
   */
  monitoringConfig: Record<string, any>;
}