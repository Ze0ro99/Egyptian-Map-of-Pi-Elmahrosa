/**
 * @fileoverview Test suite for usePayment hook with Egyptian market requirements
 * Tests payment processing, merchant verification, and bilingual error handling
 * @version 1.0.0
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react-hooks';
import { usePayment } from '../../src/hooks/usePayment';
import { paymentApi } from '../../src/api/payment.api';
import { PaymentStatus } from '../../src/interfaces/payment.interface';
import { ErrorCodes } from '../../../backend/shared/constants/error-codes';

// Mock the Pi Network SDK
const mockPiSDK = {
  createPayment: jest.fn(),
  getPaymentStatus: jest.fn(),
  createEscrow: jest.fn(),
  releaseEscrow: jest.fn()
};

// Mock window.Pi
(global as any).Pi = mockPiSDK;

// Mock payment API methods
jest.mock('../../src/api/payment.api', () => ({
  paymentApi: {
    createPayment: jest.fn(),
    getPayment: jest.fn(),
    releaseEscrow: jest.fn(),
    verifyMerchant: jest.fn(),
    validateTaxId: jest.fn()
  }
}));

describe('usePayment Hook - Egyptian Market Requirements', () => {
  // Test constants
  const MOCK_PAYMENT = {
    id: 'test-payment-id',
    amount: 100,
    status: PaymentStatus.PENDING,
    taxId: 'EG123456789',
    merchantVerificationStatus: 'VERIFIED',
    escrowId: 'test-escrow-id'
  };

  const MOCK_ERROR = {
    ar: 'خطأ في عملية الدفع',
    en: 'Payment processing error'
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup after each test
    jest.resetAllMocks();
  });

  describe('Payment Initialization', () => {
    test('should initialize payment with Egyptian tax ID validation', async () => {
      // Mock successful tax ID validation
      (paymentApi.validateTaxId as jest.Mock).mockResolvedValue(true);
      mockPiSDK.createPayment.mockResolvedValue(MOCK_PAYMENT);

      const { result } = renderHook(() => usePayment());

      await act(async () => {
        await result.current.initializePayment({
          amount: 100,
          listingId: 'test-listing',
          sellerId: 'test-seller',
          egyptianTaxId: 'EG123456789'
        });
      });

      expect(paymentApi.validateTaxId).toHaveBeenCalledWith('EG123456789');
      expect(result.current.payment).toEqual(MOCK_PAYMENT);
      expect(result.current.error).toEqual({ ar: null, en: null });
    });

    test('should handle invalid Egyptian tax ID format', async () => {
      const { result } = renderHook(() => usePayment());

      await act(async () => {
        await result.current.initializePayment({
          amount: 100,
          listingId: 'test-listing',
          sellerId: 'test-seller',
          egyptianTaxId: 'invalid-tax-id'
        });
      });

      expect(result.current.error).toEqual({
        ar: 'يرجى التحقق من المدخلات والمحاولة مرة أخرى',
        en: 'Please check your input and try again'
      });
      expect(result.current.payment).toBeNull();
    });
  });

  describe('Merchant Verification', () => {
    test('should verify Egyptian merchant status', async () => {
      (paymentApi.verifyMerchant as jest.Mock).mockResolvedValue(true);

      const { result } = renderHook(() => usePayment());

      await act(async () => {
        const isVerified = await result.current.validateEgyptianTaxId('EG123456789');
        expect(isVerified).toBe(true);
      });

      expect(paymentApi.verifyMerchant).toHaveBeenCalled();
    });

    test('should handle unverified merchant error', async () => {
      (paymentApi.verifyMerchant as jest.Mock).mockRejectedValue(
        new Error(ErrorCodes.BUSINESS_MERCHANT_NOT_VERIFIED.toString())
      );

      const { result } = renderHook(() => usePayment());

      await act(async () => {
        await result.current.initializePayment({
          amount: 100,
          listingId: 'test-listing',
          sellerId: 'test-seller',
          egyptianTaxId: 'EG123456789'
        });
      });

      expect(result.current.error).toEqual({
        ar: 'مطلوب التحقق من التاجر لهذا الإجراء',
        en: 'Merchant verification required for this action'
      });
    });
  });

  describe('Payment Status Polling', () => {
    test('should poll payment status with Egyptian timezone handling', async () => {
      mockPiSDK.getPaymentStatus
        .mockResolvedValueOnce(PaymentStatus.PROCESSING)
        .mockResolvedValueOnce(PaymentStatus.COMPLETED);

      const { result } = renderHook(() => usePayment());

      await act(async () => {
        await result.current.initializePayment({
          amount: 100,
          listingId: 'test-listing',
          sellerId: 'test-seller'
        });
      });

      // Wait for status updates
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockPiSDK.getPaymentStatus).toHaveBeenCalledWith(MOCK_PAYMENT.id);
      expect(result.current.payment?.status).toBe(PaymentStatus.COMPLETED);
    });
  });

  describe('Escrow Management', () => {
    test('should manage payment escrow with Egyptian legal compliance', async () => {
      mockPiSDK.createEscrow.mockResolvedValue({
        escrowId: 'test-escrow-id',
        releaseDate: new Date(),
        legalReference: 'EGY-123456'
      });

      const { result } = renderHook(() => usePayment());

      await act(async () => {
        await result.current.managePaymentEscrow('test-payment-id', 7);
      });

      expect(mockPiSDK.createEscrow).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentId: 'test-payment-id',
          duration: 7,
          metadata: expect.objectContaining({
            timezone: 'Africa/Cairo'
          })
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors with bilingual messages', async () => {
      mockPiSDK.createPayment.mockRejectedValue(
        new Error(ErrorCodes.NETWORK_REQUEST_FAILED.toString())
      );

      const { result } = renderHook(() => usePayment());

      await act(async () => {
        await result.current.initializePayment({
          amount: 100,
          listingId: 'test-listing',
          sellerId: 'test-seller'
        });
      });

      expect(result.current.error).toEqual({
        ar: 'خطأ في اتصال الشبكة. يرجى التحقق من الإنترنت',
        en: 'Network connection error. Please check your internet'
      });
    });

    test('should handle Pi Network integration errors', async () => {
      mockPiSDK.createPayment.mockRejectedValue(
        new Error(ErrorCodes.INTEGRATION_PI_NETWORK_ERROR.toString())
      );

      const { result } = renderHook(() => usePayment());

      await act(async () => {
        await result.current.initializePayment({
          amount: 100,
          listingId: 'test-listing',
          sellerId: 'test-seller'
        });
      });

      expect(result.current.error).toEqual({
        ar: 'تعذر الاتصال بشبكة Pi. يرجى المحاولة مرة أخرى',
        en: 'Unable to connect to Pi Network. Please try again'
      });
    });
  });
});