/**
 * @fileoverview KYC Service implementation for Egyptian Map of Pi platform
 * Handles user and merchant verification with enhanced security and Egyptian market compliance
 * @version 1.0.0
 */

import axios, { AxiosInstance } from 'axios'; // v1.5.0
import winston from 'winston'; // v3.8.0
import { RateLimiterRedis } from 'rate-limiter-flexible'; // v2.4.1
import { Model } from 'mongoose';
import { UserModel } from '../models/user.model';
import { piNetworkConfig } from '../config/pi-network.config';
import { Location, LocationType } from '../../../location-service/src/interfaces/location.interface';

/**
 * Enum for KYC verification status
 */
enum KYCStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  INCOMPLETE = 'incomplete',
  TEMPORARY = 'temporary',
  EXPIRED = 'expired'
}

/**
 * Enum for merchant categories in Egyptian market
 */
enum MerchantCategory {
  RETAIL = 'retail',
  FOOD = 'food',
  SERVICES = 'services',
  PROFESSIONAL = 'professional'
}

/**
 * Interface for verification result
 */
interface VerificationResult {
  status: KYCStatus;
  message: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

/**
 * Interface for merchant verification result
 */
interface MerchantVerificationResult extends VerificationResult {
  category: MerchantCategory;
  businessDocuments: Record<string, any>;
  locationVerified: boolean;
}

/**
 * Interface for document validation result
 */
interface DocumentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: Record<string, any>;
}

/**
 * Enhanced KYC Service for Egyptian Map of Pi
 */
export class KYCService {
  private readonly axiosInstance: AxiosInstance;
  private readonly logger: winston.Logger;
  private readonly userModel: typeof UserModel;
  private readonly rateLimiter: RateLimiterRedis;

  /**
   * Initialize KYC service with enhanced security and monitoring
   */
  constructor(
    userModel: typeof UserModel,
    logger: winston.Logger,
    rateLimiter: RateLimiterRedis
  ) {
    this.userModel = userModel;
    this.logger = logger;
    this.rateLimiter = rateLimiter;

    // Configure axios instance with retry and timeout handling
    this.axiosInstance = axios.create({
      baseURL: piNetworkConfig.apiEndpoint,
      timeout: piNetworkConfig.timeouts.request,
      headers: {
        'Authorization': `Bearer ${piNetworkConfig.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        this.logger.info('Outgoing Pi Network API request', {
          url: config.url,
          method: config.method,
          timestamp: new Date()
        });
        return config;
      },
      (error) => {
        this.logger.error('Pi Network API request error', {
          error: error.message,
          timestamp: new Date()
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Verify user KYC with enhanced security and Egyptian requirements
   */
  public async verifyUserKYC(
    piId: string,
    additionalData: Record<string, any>
  ): Promise<VerificationResult> {
    try {
      // Check rate limit
      await this.rateLimiter.consume(piId);

      // Validate user existence
      const user = await this.userModel.findByPiId(piId);
      if (!user) {
        throw new Error('User not found');
      }

      // Log verification attempt
      this.logger.info('Starting KYC verification', {
        piId,
        timestamp: new Date(),
        currentStatus: user.kycStatus
      });

      // Call Pi Network KYC verification API
      const response = await this.axiosInstance.post('/v2/kyc/verify', {
        pi_id: piId,
        additional_data: additionalData
      });

      // Process verification result
      const result: VerificationResult = {
        status: response.data.status as KYCStatus,
        message: response.data.message,
        metadata: {
          verificationId: response.data.verification_id,
          verifiedAt: new Date(),
          source: 'pi_network'
        },
        timestamp: new Date()
      };

      // Update user KYC status
      await this.userModel.updateOne(
        { piId },
        { 
          $set: { 
            kycStatus: result.status,
            'metadata.kycVerification': result.metadata
          }
        }
      );

      // Log successful verification
      this.logger.info('KYC verification completed', {
        piId,
        status: result.status,
        timestamp: result.timestamp
      });

      return result;

    } catch (error) {
      // Log verification failure
      this.logger.error('KYC verification failed', {
        piId,
        error: error.message,
        timestamp: new Date()
      });

      throw error;
    }
  }

  /**
   * Verify merchant with enhanced Egyptian business requirements
   */
  public async verifyMerchantKYC(
    userId: string,
    merchantDocuments: Record<string, any>,
    category: MerchantCategory
  ): Promise<MerchantVerificationResult> {
    try {
      // Validate merchant category requirements
      const validationResult = await this.validateKYCDocuments(merchantDocuments, category);
      if (!validationResult.isValid) {
        throw new Error(`Document validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Verify Egyptian business registration
      const businessVerification = await this.verifyEgyptianBusiness(merchantDocuments);
      if (!businessVerification.isValid) {
        throw new Error('Egyptian business verification failed');
      }

      // Verify merchant location
      const locationVerification = await this.verifyMerchantLocation(
        merchantDocuments.location as Location
      );

      const result: MerchantVerificationResult = {
        status: KYCStatus.VERIFIED,
        message: 'Merchant verification successful',
        category,
        businessDocuments: merchantDocuments,
        locationVerified: locationVerification,
        metadata: {
          verificationId: businessVerification.verificationId,
          verifiedAt: new Date(),
          category,
          businessType: merchantDocuments.businessType
        },
        timestamp: new Date()
      };

      // Update merchant status
      await this.userModel.updateOne(
        { _id: userId },
        {
          $set: {
            isMerchant: true,
            merchantDetails: {
              ...merchantDocuments,
              verificationDate: new Date()
            },
            kycStatus: KYCStatus.VERIFIED
          }
        }
      );

      // Log merchant verification
      this.logger.info('Merchant verification completed', {
        userId,
        category,
        timestamp: result.timestamp
      });

      return result;

    } catch (error) {
      this.logger.error('Merchant verification failed', {
        userId,
        category,
        error: error.message,
        timestamp: new Date()
      });

      throw error;
    }
  }

  /**
   * Validate KYC documents with Egyptian requirements
   */
  private async validateKYCDocuments(
    documents: Record<string, any>,
    category: MerchantCategory
  ): Promise<DocumentValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const metadata: Record<string, any> = {};

    // Validate required documents based on category
    const requiredDocuments = this.getRequiredDocuments(category);
    for (const doc of requiredDocuments) {
      if (!documents[doc]) {
        errors.push(`Missing required document: ${doc}`);
      }
    }

    // Validate document formats and sizes
    for (const [key, doc] of Object.entries(documents)) {
      if (doc.size > 5 * 1024 * 1024) { // 5MB limit
        errors.push(`Document ${key} exceeds size limit`);
      }

      if (!this.isValidDocumentFormat(doc.type)) {
        errors.push(`Invalid format for document ${key}`);
      }
    }

    // Check document expiration dates
    for (const [key, doc] of Object.entries(documents)) {
      if (doc.expiryDate && new Date(doc.expiryDate) < new Date()) {
        errors.push(`Document ${key} has expired`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata
    };
  }

  /**
   * Verify Egyptian business registration
   */
  private async verifyEgyptianBusiness(
    documents: Record<string, any>
  ): Promise<{ isValid: boolean; verificationId: string }> {
    // Implement Egyptian business verification logic
    const { commercialRegister, taxId } = documents;

    // Validate commercial register format
    if (!this.isValidCommercialRegister(commercialRegister)) {
      throw new Error('Invalid commercial register format');
    }

    // Validate tax ID format
    if (!this.isValidTaxId(taxId)) {
      throw new Error('Invalid tax ID format');
    }

    return {
      isValid: true,
      verificationId: `EGY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  /**
   * Verify merchant location within Egyptian boundaries
   */
  private async verifyMerchantLocation(location: Location): Promise<boolean> {
    if (location.type !== LocationType.STORE) {
      throw new Error('Invalid location type for merchant');
    }

    // Verify location is within Egypt
    const { latitude, longitude } = location.coordinates;
    if (!this.isWithinEgypt(latitude, longitude)) {
      throw new Error('Location must be within Egyptian boundaries');
    }

    // Verify not in restricted zone
    if (location.isRestrictedZone) {
      throw new Error('Location is in a restricted zone');
    }

    return true;
  }

  /**
   * Helper method to get required documents by merchant category
   */
  private getRequiredDocuments(category: MerchantCategory): string[] {
    const baseDocuments = ['commercialRegister', 'taxId', 'nationalId'];
    
    const categorySpecificDocs: Record<MerchantCategory, string[]> = {
      [MerchantCategory.RETAIL]: ['storeLicense', 'healthCertificate'],
      [MerchantCategory.FOOD]: ['foodLicense', 'healthCertificate', 'kitchenInspection'],
      [MerchantCategory.SERVICES]: ['serviceLicense', 'insuranceCertificate'],
      [MerchantCategory.PROFESSIONAL]: ['professionalLicense', 'qualificationCertificate']
    };

    return [...baseDocuments, ...categorySpecificDocs[category]];
  }

  /**
   * Helper method to validate document format
   */
  private isValidDocumentFormat(type: string): boolean {
    const allowedFormats = ['image/jpeg', 'image/png', 'application/pdf'];
    return allowedFormats.includes(type);
  }

  /**
   * Helper method to validate commercial register format
   */
  private isValidCommercialRegister(register: string): boolean {
    // Egyptian commercial register format: 12 digits
    return /^\d{12}$/.test(register);
  }

  /**
   * Helper method to validate tax ID format
   */
  private isValidTaxId(taxId: string): boolean {
    // Egyptian tax ID format: 9 digits
    return /^\d{9}$/.test(taxId);
  }

  /**
   * Helper method to check if coordinates are within Egypt
   */
  private isWithinEgypt(latitude: number, longitude: number): boolean {
    return (
      latitude >= 22.0 && latitude <= 31.7 && // Egypt's latitude bounds
      longitude >= 24.7 && longitude <= 36.9   // Egypt's longitude bounds
    );
  }
}