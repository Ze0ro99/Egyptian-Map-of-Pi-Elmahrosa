/**
 * @fileoverview Storage configuration for Egyptian Map of Pi marketplace service
 * Implements secure S3-compatible storage and CDN settings optimized for Egyptian market
 * Version: 1.0.0
 */

import { config } from 'dotenv'; // v16.3.1
import { ConfigInterface } from '../../../shared/interfaces/config.interface';

// Initialize environment variables
config();

/**
 * Interface defining comprehensive storage configuration structure
 */
export interface StorageConfig {
  // Core storage settings
  bucketName: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  cdnDomain: string;
  
  // File handling constraints
  maxFileSize: number;
  allowedMimeTypes: string[];
  maxImagesPerListing: number;
  
  // Security settings
  enableEncryption: boolean;
  encryptionKeyId: string;
  allowedRegions: string[];
  
  // CDN configuration
  cdnConfig: {
    enabled: boolean;
    priceClass: string;
    ttl: number;
    defaultRootObject: string;
    edgeLocations: string[];
    customHeaders: Record<string, string>;
  };
  
  // Enhanced security settings
  securitySettings: {
    enableVirusScanning: boolean;
    enableImageValidation: boolean;
    maxConcurrentUploads: number;
    corsAllowedOrigins: string[];
    signedUrlExpiration: number;
    encryptionAlgorithm: string;
  };
}

/**
 * Maximum file size (5MB) optimized for Egyptian internet speeds
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Allowed image MIME types with strict validation
 */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp'
];

/**
 * Maximum images per listing as per UI specification
 */
export const MAX_IMAGES_PER_LISTING = 5;

/**
 * Allowed AWS regions prioritizing Middle East for Egyptian market
 */
export const ALLOWED_REGIONS = [
  'me-south-1', // Bahrain (Primary)
  'eu-south-1'  // Milan (Secondary/DR)
];

/**
 * CDN configuration optimized for Egyptian market
 */
export const CDN_CONFIG = {
  enabled: true,
  priceClass: 'PriceClass_200', // Optimized for Middle East coverage
  ttl: 86400, // 24 hours
  defaultRootObject: 'index.html',
  edgeLocations: [
    'CAI1', // Cairo
    'ALY1', // Alexandria
    'BAH1', // Bahrain
    'DXB1'  // Dubai
  ],
  customHeaders: {
    'Cache-Control': 'public, max-age=86400',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  }
};

/**
 * Enhanced security settings for storage
 */
export const SECURITY_SETTINGS = {
  enableVirusScanning: true,
  enableImageValidation: true,
  maxConcurrentUploads: 3,
  corsAllowedOrigins: [
    process.env.FRONTEND_URL || '',
    process.env.ADMIN_PORTAL_URL || '',
    'https://*.minepi.com'
  ],
  signedUrlExpiration: 300, // 5 minutes
  encryptionAlgorithm: 'AES-256'
};

/**
 * Validates storage configuration completeness and security compliance
 * @param config StorageConfig object to validate
 * @returns boolean indicating validation success
 * @throws Error if validation fails
 */
export const validateConfig = (config: StorageConfig): boolean => {
  // Validate required environment variables
  if (!config.bucketName || !config.accessKeyId || !config.secretAccessKey) {
    throw new Error('Missing required storage credentials');
  }

  // Validate region
  if (!ALLOWED_REGIONS.includes(config.region)) {
    throw new Error(`Invalid region. Must be one of: ${ALLOWED_REGIONS.join(', ')}`);
  }

  // Validate CDN domain format
  const cdnDomainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-_.]+\.[a-zA-Z]{2,}$/;
  if (!cdnDomainRegex.test(config.cdnDomain)) {
    throw new Error('Invalid CDN domain format');
  }

  // Validate security settings
  if (config.enableEncryption && !config.encryptionKeyId) {
    throw new Error('Encryption key ID required when encryption is enabled');
  }

  return true;
};

/**
 * Initializes storage configuration with security measures and Egyptian market optimizations
 * @returns Promise<StorageConfig> Initialized storage configuration
 */
export const initializeStorage = async (): Promise<StorageConfig> => {
  const storageConfig: StorageConfig = {
    bucketName: process.env.STORAGE_BUCKET_NAME || '',
    region: process.env.STORAGE_REGION || ALLOWED_REGIONS[0],
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY || '',
    cdnDomain: process.env.CDN_DOMAIN || '',
    maxFileSize: MAX_FILE_SIZE,
    allowedMimeTypes: ALLOWED_MIME_TYPES,
    maxImagesPerListing: MAX_IMAGES_PER_LISTING,
    enableEncryption: process.env.ENABLE_STORAGE_ENCRYPTION === 'true',
    encryptionKeyId: process.env.STORAGE_ENCRYPTION_KEY_ID || '',
    allowedRegions: ALLOWED_REGIONS,
    cdnConfig: CDN_CONFIG,
    securitySettings: SECURITY_SETTINGS
  };

  // Validate configuration
  validateConfig(storageConfig);

  return storageConfig;
};

/**
 * Exported storage configuration instance
 * Implements security measures and Egyptian market optimizations
 */
export const storageConfig = await initializeStorage();

export default storageConfig;