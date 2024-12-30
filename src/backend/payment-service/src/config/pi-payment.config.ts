/**
 * @fileoverview Enhanced Pi Network payment configuration for Egyptian Map of Pi marketplace
 * Implements comprehensive payment processing, security, and compliance features for the Egyptian market
 * @version 1.0.0
 */

import { config } from 'dotenv'; // v16.3.1
import { AuthConfig } from '../../../shared/interfaces/config.interface';

// Initialize environment variables
config();

/**
 * Enhanced interface for Pi payment configuration with Egyptian market requirements
 */
interface PiPaymentConfig {
  /** Pi Network payment API endpoint */
  apiEndpoint: string;
  /** API key for Pi Network integration */
  apiKey: string;
  /** Enable sandbox mode for testing */
  sandboxMode: boolean;
  /** Enhanced escrow service configuration */
  escrowSettings: {
    defaultDurationDays: number;
    autoRelease: boolean;
    disputeWindow: number;
    egyptianBusinessHours: {
      start: number;
      end: number;
      timezone: string;
    };
  };
  /** Transaction limits configuration */
  transactionLimits: {
    minAmount: number;
    maxAmount: number;
    dailyLimit: number;
    monthlyLimit: number;
    merchantLimits: {
      daily: number;
      monthly: number;
      perTransaction: number;
    };
  };
  /** Egyptian market-specific configuration */
  egyptianMarketConfig: {
    businessHours: {
      start: number;
      end: number;
      timezone: string;
    };
    currencyConversion: {
      enabled: boolean;
      provider: string;
      updateInterval: number;
    };
    disputeResolution: {
      windowHours: number;
      escalationPath: string[];
      autoResolutionEnabled: boolean;
    };
  };
  /** Enhanced security settings */
  securitySettings: {
    transactionVerification: boolean;
    ipValidation: boolean;
    fraudDetection: boolean;
    encryptionAlgorithm: string;
    signatureValidation: boolean;
    rateLimiting: {
      enabled: boolean;
      maxTransactionsPerHour: number;
      maxVolumePerDay: number;
    };
  };
}

// Constants for payment configuration
const DEFAULT_ESCROW_DURATION_DAYS = 7;
const MIN_TRANSACTION_AMOUNT = 0.1;
const MAX_TRANSACTION_AMOUNT = 10000;
const EGYPTIAN_BUSINESS_HOURS = {
  start: 9,
  end: 22,
  timezone: 'Africa/Cairo'
};
const DISPUTE_WINDOW_HOURS = 48;

/**
 * Loads and validates enhanced Pi payment configuration with Egyptian market parameters
 * @returns {PiPaymentConfig} Validated payment configuration object
 * @throws {Error} If required configuration values are missing or invalid
 */
const loadPiPaymentConfig = (): PiPaymentConfig => {
  // Validate required environment variables
  if (!process.env.PI_API_KEY) {
    throw new Error('PI_API_KEY environment variable is required');
  }

  // Initialize comprehensive payment configuration
  const paymentConfig: PiPaymentConfig = {
    apiEndpoint: process.env.PI_API_ENDPOINT || 'https://api.minepi.com/v2/payments',
    apiKey: process.env.PI_API_KEY,
    sandboxMode: process.env.NODE_ENV !== 'production',
    
    escrowSettings: {
      defaultDurationDays: DEFAULT_ESCROW_DURATION_DAYS,
      autoRelease: true,
      disputeWindow: DISPUTE_WINDOW_HOURS,
      egyptianBusinessHours: EGYPTIAN_BUSINESS_HOURS
    },
    
    transactionLimits: {
      minAmount: MIN_TRANSACTION_AMOUNT,
      maxAmount: MAX_TRANSACTION_AMOUNT,
      dailyLimit: 50000,
      monthlyLimit: 1000000,
      merchantLimits: {
        daily: 100000,
        monthly: 2000000,
        perTransaction: MAX_TRANSACTION_AMOUNT
      }
    },
    
    egyptianMarketConfig: {
      businessHours: EGYPTIAN_BUSINESS_HOURS,
      currencyConversion: {
        enabled: true,
        provider: 'egyptian-central-bank',
        updateInterval: 3600 // 1 hour
      },
      disputeResolution: {
        windowHours: DISPUTE_WINDOW_HOURS,
        escalationPath: ['merchant', 'support', 'arbitration'],
        autoResolutionEnabled: true
      }
    },
    
    securitySettings: {
      transactionVerification: true,
      ipValidation: true,
      fraudDetection: true,
      encryptionAlgorithm: 'AES-256-GCM',
      signatureValidation: true,
      rateLimiting: {
        enabled: true,
        maxTransactionsPerHour: 100,
        maxVolumePerDay: 500000
      }
    }
  };

  // Validate configuration values
  if (paymentConfig.transactionLimits.maxAmount > MAX_TRANSACTION_AMOUNT) {
    throw new Error(`Maximum transaction amount cannot exceed ${MAX_TRANSACTION_AMOUNT} Pi`);
  }

  if (paymentConfig.transactionLimits.minAmount < MIN_TRANSACTION_AMOUNT) {
    throw new Error(`Minimum transaction amount cannot be less than ${MIN_TRANSACTION_AMOUNT} Pi`);
  }

  return paymentConfig;
};

// Initialize and export payment configuration
export const piPaymentConfig = loadPiPaymentConfig();

// Export configuration interface for type checking
export type { PiPaymentConfig };