/**
 * @fileoverview Integration tests for payment service with Egyptian market validations
 * Tests payment processing, market rules compliance, and transaction security
 * @version 1.0.0
 */

import { describe, beforeAll, afterAll, it, expect, jest } from '@jest/globals'; // v29.0.0
import supertest from 'supertest'; // v6.3.0
import { MockInstance } from 'jest-mock'; // v29.0.0
import moment from 'moment-timezone'; // v0.5.43

import { PaymentsController } from '../../src/controllers/payments.controller';
import { PiPaymentService } from '../../src/services/pi-payment.service';
import { IPayment, PaymentStatus } from '../../src/interfaces/payment.interface';
import { TransactionType } from '../../src/interfaces/transaction.interface';

describe('Payment Integration Tests', () => {
  let app: any;
  let paymentsController: PaymentsController;
  let piPaymentService: PiPaymentService;
  let piNetworkMock: MockInstance;
  let paymentModelMock: MockInstance;

  const testPayment: IPayment = {
    id: 'test-payment-1',
    amount: 100,
    status: PaymentStatus.PENDING,
    buyerId: 'test-buyer',
    sellerId: 'test-seller',
    listingId: 'test-listing',
    escrowId: 'test-escrow',
    piPaymentId: 'pi-payment-1',
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true
  };

  beforeAll(async () => {
    // Mock Pi Network SDK
    piNetworkMock = jest.spyOn(PiPaymentService.prototype, 'processPayment');
    piNetworkMock.mockImplementation(async () => testPayment);

    // Mock Payment Model
    paymentModelMock = jest.spyOn(PaymentsController.prototype, 'initializePayment');
    paymentModelMock.mockImplementation(async () => testPayment);

    // Initialize test app and controllers
    app = supertest(app);
    paymentsController = new PaymentsController(
      new PiPaymentService(null, null),
      null
    );
  });

  afterAll(async () => {
    jest.clearAllMocks();
  });

  describe('Payment Initialization', () => {
    it('should initialize payment during Egyptian business hours', async () => {
      // Mock Cairo time to be during business hours (10 AM)
      const cairoTime = moment.tz('Africa/Cairo').hour(10);
      jest.spyOn(Date, 'now').mockImplementation(() => cairoTime.valueOf());

      const response = await app
        .post('/api/payments/initialize')
        .send({
          amount: 100,
          buyerId: 'test-buyer',
          sellerId: 'test-seller',
          listingId: 'test-listing'
        })
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        amount: 100,
        status: PaymentStatus.PENDING,
        buyerId: 'test-buyer'
      });
    });

    it('should reject payment outside Egyptian business hours', async () => {
      // Mock Cairo time to be outside business hours (3 AM)
      const cairoTime = moment.tz('Africa/Cairo').hour(3);
      jest.spyOn(Date, 'now').mockImplementation(() => cairoTime.valueOf());

      await app
        .post('/api/payments/initialize')
        .send({
          amount: 100,
          buyerId: 'test-buyer',
          sellerId: 'test-seller',
          listingId: 'test-listing'
        })
        .expect(400);
    });

    it('should validate payment amount against Egyptian market rules', async () => {
      const cairoTime = moment.tz('Africa/Cairo').hour(10);
      jest.spyOn(Date, 'now').mockImplementation(() => cairoTime.valueOf());

      // Test amount exceeding market limit
      await app
        .post('/api/payments/initialize')
        .send({
          amount: 20000, // Exceeds maximum limit
          buyerId: 'test-buyer',
          sellerId: 'test-seller',
          listingId: 'test-listing'
        })
        .expect(400);

      // Test amount below market minimum
      await app
        .post('/api/payments/initialize')
        .send({
          amount: 0.01, // Below minimum limit
          buyerId: 'test-buyer',
          sellerId: 'test-seller',
          listingId: 'test-listing'
        })
        .expect(400);
    });
  });

  describe('Payment Processing', () => {
    it('should process payment with Egyptian market validation', async () => {
      const cairoTime = moment.tz('Africa/Cairo').hour(14); // 2 PM Cairo time
      jest.spyOn(Date, 'now').mockImplementation(() => cairoTime.valueOf());

      const response = await app
        .post('/api/payments/test-payment-1/process')
        .send({
          piTransactionId: 'pi-tx-1'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'test-payment-1',
        status: PaymentStatus.COMPLETED,
        metadata: {
          regulatoryCategory: expect.any(String),
          notes: expect.stringContaining('Egyptian market')
        }
      });
    });

    it('should handle escrow requirements for high-value transactions', async () => {
      const cairoTime = moment.tz('Africa/Cairo').hour(14);
      jest.spyOn(Date, 'now').mockImplementation(() => cairoTime.valueOf());

      const response = await app
        .post('/api/payments/initialize')
        .send({
          amount: 5000, // High-value transaction
          buyerId: 'test-buyer',
          sellerId: 'test-seller',
          listingId: 'test-listing'
        })
        .expect(201);

      expect(response.body).toMatchObject({
        escrowId: expect.any(String),
        metadata: {
          regulatoryCategory: 'HIGH_VALUE'
        }
      });
    });
  });

  describe('Market Compliance', () => {
    it('should validate weekend trading restrictions', async () => {
      // Mock Friday in Cairo (weekend)
      const fridayInCairo = moment.tz('Africa/Cairo').day(5).hour(10);
      jest.spyOn(Date, 'now').mockImplementation(() => fridayInCairo.valueOf());

      await app
        .post('/api/payments/initialize')
        .send({
          amount: 100,
          buyerId: 'test-buyer',
          sellerId: 'test-seller',
          listingId: 'test-listing'
        })
        .expect(400);
    });

    it('should track regulatory categories correctly', async () => {
      const cairoTime = moment.tz('Africa/Cairo').hour(14);
      jest.spyOn(Date, 'now').mockImplementation(() => cairoTime.valueOf());

      const response = await app
        .post('/api/payments/initialize')
        .send({
          amount: 7500,
          buyerId: 'test-buyer',
          sellerId: 'test-seller',
          listingId: 'test-listing'
        })
        .expect(201);

      expect(response.body.metadata.regulatoryCategory).toBe('HIGH_VALUE');
      expect(response.body.metadata.auditTrail).toContainEqual(
        expect.objectContaining({
          action: 'CREATED',
          reason: expect.stringContaining('Egyptian marketplace')
        })
      );
    });
  });

  describe('Transaction History', () => {
    it('should retrieve user payment history with market data', async () => {
      const response = await app
        .get('/api/payments/user/test-buyer')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body[0]).toMatchObject({
        id: expect.any(String),
        amount: expect.any(Number),
        status: expect.any(String),
        metadata: {
          regulatoryCategory: expect.any(String),
          notes: expect.stringContaining('Egyptian')
        }
      });
    });

    it('should filter transactions by regulatory category', async () => {
      const response = await app
        .get('/api/payments/user/test-buyer')
        .query({ regulatoryCategory: 'HIGH_VALUE' })
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      response.body.forEach((payment: IPayment) => {
        expect(payment.metadata.regulatoryCategory).toBe('HIGH_VALUE');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle Pi Network connectivity issues', async () => {
      piNetworkMock.mockRejectedValueOnce(new Error('Network Error'));

      await app
        .post('/api/payments/test-payment-1/process')
        .send({
          piTransactionId: 'pi-tx-1'
        })
        .expect(500);
    });

    it('should handle invalid payment state transitions', async () => {
      const completedPayment = { ...testPayment, status: PaymentStatus.COMPLETED };
      paymentModelMock.mockResolvedValueOnce(completedPayment);

      await app
        .post('/api/payments/test-payment-1/process')
        .send({
          piTransactionId: 'pi-tx-1'
        })
        .expect(400);
    });
  });
});