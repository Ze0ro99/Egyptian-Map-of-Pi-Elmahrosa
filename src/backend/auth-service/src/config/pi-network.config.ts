/**
 * @fileoverview Pi Network integration configuration for Egyptian Map of Pi auth service
 * Implements secure configuration management with comprehensive validation and environment controls
 * @version 1.0.0
 */

import { config } from 'dotenv'; // v16.0.0
import { AuthConfig } from '../../../shared/interfaces/config.interface';

// Load environment variables
config();

/**
 * Interface defining comprehensive Pi Network configuration structure
 */
interface PiNetworkConfig {
  /**
   * Pi Network API key for authentication
   * @required
   */
  apiKey: string;

  /**
   * Base URL for Pi Network API endpoints
   * @default https://api.minepi.com
   */
  apiEndpoint: string;

  /**
   * Pi Platform API version
   * @default v2
   */
  platformApiVersion: string;

  /**
   * Whether sandbox mode is enabled (true in non-production)
   */
  sandboxMode: boolean;

  /**
   * Secret for validating Pi Network webhooks
   * @required
   */
  webhookSecret: string;

  /**
   * Retry configuration for failed requests
   */
  retryOptions: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
  };

  /**
   * Timeout configuration in milliseconds
   */
  timeouts: {
    request: number;
    webhook: number;
  };

  /**
   * Security configuration
   */
  security: {
    validatePayload: boolean;
    validateSignature: boolean;
    requireHttps: boolean;
  };
}

/**
 * Validates Pi Network configuration settings
 * Throws error if configuration is invalid
 */
const validateConfig = (config: PiNetworkConfig): void => {
  // Validate required environment variables
  if (!config.apiKey) {
    throw new Error('PI_NETWORK_API_KEY is required');
  }

  if (!config.webhookSecret) {
    throw new Error('PI_NETWORK_WEBHOOK_SECRET is required');
  }

  // Validate API key format (should be 32+ characters)
  if (config.apiKey.length < 32) {
    throw new Error('Invalid PI_NETWORK_API_KEY format');
  }

  // Validate API endpoint URL
  try {
    new URL(config.apiEndpoint);
  } catch {
    throw new Error('Invalid PI_NETWORK_API_ENDPOINT URL format');
  }

  // Validate platform version format
  if (!/^v\d+$/.test(config.platformApiVersion)) {
    throw new Error('Invalid PI_NETWORK_API_VERSION format');
  }

  // Validate timeout values
  if (config.timeouts.request < 1000 || config.timeouts.webhook < 1000) {
    throw new Error('Timeout values must be at least 1000ms');
  }

  // Validate retry options
  if (config.retryOptions.maxRetries < 0 || config.retryOptions.baseDelay < 100) {
    throw new Error('Invalid retry configuration');
  }
};

/**
 * Pi Network configuration object with comprehensive settings
 */
export const piNetworkConfig: PiNetworkConfig = {
  apiKey: process.env.PI_NETWORK_API_KEY as string,
  apiEndpoint: process.env.PI_NETWORK_API_ENDPOINT || 'https://api.minepi.com',
  platformApiVersion: process.env.PI_NETWORK_API_VERSION || 'v2',
  sandboxMode: process.env.NODE_ENV !== 'production',
  webhookSecret: process.env.PI_NETWORK_WEBHOOK_SECRET as string,

  retryOptions: {
    maxRetries: Number(process.env.PI_NETWORK_MAX_RETRIES || '3'),
    baseDelay: Number(process.env.PI_NETWORK_RETRY_DELAY || '1000'),
    maxDelay: 10000,
  },

  timeouts: {
    request: Number(process.env.PI_NETWORK_REQUEST_TIMEOUT || '30000'),
    webhook: Number(process.env.PI_NETWORK_WEBHOOK_TIMEOUT || '60000'),
  },

  security: {
    validatePayload: true,
    validateSignature: true,
    requireHttps: process.env.NODE_ENV === 'production',
  },
};

// Validate configuration on initialization
validateConfig(piNetworkConfig);

/**
 * Default export of validated Pi Network configuration
 */
export default piNetworkConfig;

/**
 * Export individual configuration properties for granular access
 */
export const {
  apiKey,
  apiEndpoint,
  platformApiVersion,
  sandboxMode,
  webhookSecret,
  retryOptions,
  timeouts,
  security,
} = piNetworkConfig;