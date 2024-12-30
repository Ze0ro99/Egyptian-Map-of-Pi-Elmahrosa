/**
 * @fileoverview Frontend API module for payment processing in Egyptian Map of Pi
 * Implements secure payment operations with Egyptian market compliance
 * @version 1.0.0
 */

import { AxiosResponse } from 'axios'; // ^1.5.0
import { apiService } from '../services/api.service';
import { Payment, PaymentStatus, PaymentFilter, PaymentEscrow } from '../interfaces/payment.interface';
import { ErrorCodes } from '../../../backend/shared/constants/error-codes';

/**
 * API endpoints for payment operations
 */
const API_ENDPOINTS = {
  CREATE_PAYMENT: '/payments',
  GET_PAYMENT: '/payments/:id',
  GET_USER_PAYMENTS: '/payments/user/:userId',
  RELEASE_ESCROW: '/payments/:id/release',
  REFUND_PAYMENT: '/payments/:id/refund',
  VERIFY_MERCHANT: '/payments/verify-merchant',
  VALIDATE_TAX_ID: '/payments/validate-tax-id'
} as const;

/**
 * Transaction limits for Egyptian market
 */
const TRANSACTION_LIMITS = {
  MIN_AMOUNT: 1, // Minimum 1 Pi
  MAX_AMOUNT: 100000, // Maximum 100,000 Pi
  DAILY_LIMIT: 500000 // Daily limit 500,000 Pi
} as const;

/**
 * Interface for payment creation request
 */
interface PaymentCreateDto {
  amount: number;
  listingId: string;
  sellerId: string;
  egyptianTaxId?: string;
  escrowDuration?: number;
}

/**
 * Interface for merchant verification request
 */
interface MerchantVerificationDto {
  merchantId: string;
  taxId: string;
  businessRegistrationNumber: string;
}

/**
 * Payment API service with Egyptian market adaptations
 */
export const paymentApi = {
  /**
   * Creates a new payment with Egyptian market validation
   * @param paymentData Payment creation data
   * @returns Created payment object
   */
  async createPayment(paymentData: PaymentCreateDto): Promise<Payment> {
    // Validate transaction amount
    if (paymentData.amount < TRANSACTION_LIMITS.MIN_AMOUNT || 
        paymentData.amount > TRANSACTION_LIMITS.MAX_AMOUNT) {
      throw new Error(ErrorCodes.TRANSACTION_INVALID_AMOUNT.toString());
    }

    // Validate Egyptian tax ID if provided
    if (paymentData.egyptianTaxId) {
      const taxIdValid = await this.validateEgyptianTaxId(paymentData.egyptianTaxId);
      if (!taxIdValid) {
        throw new Error(ErrorCodes.BUSINESS_MERCHANT_NOT_VERIFIED.toString());
      }
    }

    try {
      const response = await apiService.post<Payment>(
        API_ENDPOINTS.CREATE_PAYMENT,
        paymentData
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Retrieves payment details by ID
   * @param paymentId Payment identifier
   * @returns Payment details
   */
  async getPayment(paymentId: string): Promise<Payment> {
    try {
      const response = await apiService.get<Payment>(
        API_ENDPOINTS.GET_PAYMENT.replace(':id', paymentId)
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Retrieves user's payment history
   * @param userId User identifier
   * @param filter Payment filter criteria
   * @returns Array of payments
   */
  async getUserPayments(userId: string, filter?: PaymentFilter): Promise<Payment[]> {
    try {
      const response = await apiService.get<Payment[]>(
        API_ENDPOINTS.GET_USER_PAYMENTS.replace(':userId', userId),
        { params: filter }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Releases payment from escrow
   * @param paymentId Payment identifier
   * @returns Updated payment status
   */
  async releaseEscrow(paymentId: string): Promise<Payment> {
    try {
      const response = await apiService.post<Payment>(
        API_ENDPOINTS.RELEASE_ESCROW.replace(':id', paymentId)
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Processes payment refund
   * @param paymentId Payment identifier
   * @param reason Refund reason
   * @returns Updated payment status
   */
  async refundPayment(paymentId: string, reason: string): Promise<Payment> {
    try {
      const response = await apiService.post<Payment>(
        API_ENDPOINTS.REFUND_PAYMENT.replace(':id', paymentId),
        { reason }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Validates Egyptian merchant credentials
   * @param verificationData Merchant verification data
   * @returns Verification status
   */
  async verifyEgyptianMerchant(verificationData: MerchantVerificationDto): Promise<boolean> {
    try {
      const response = await apiService.post<{ verified: boolean }>(
        API_ENDPOINTS.VERIFY_MERCHANT,
        verificationData
      );
      return response.data.verified;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Validates Egyptian tax ID format and status
   * @param taxId Egyptian tax ID
   * @returns Validation status
   */
  async validateEgyptianTaxId(taxId: string): Promise<boolean> {
    try {
      const response = await apiService.post<{ valid: boolean }>(
        API_ENDPOINTS.VALIDATE_TAX_ID,
        { taxId }
      );
      return response.data.valid;
    } catch (error) {
      throw error;
    }
  }
};