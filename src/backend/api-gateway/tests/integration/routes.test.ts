/**
 * @fileoverview Integration tests for Egyptian Map of Pi API Gateway routes
 * Tests authentication flows, KYC verification, merchant registration, and
 * location-based validations with comprehensive coverage of Egyptian market requirements.
 * 
 * @version 1.0.0
 */

import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import supertest from 'supertest'; // ^6.3.3
import express, { Express } from 'express';
import router from '../../src/routes/auth.routes';
import { authenticate, validateEgyptLocation } from '../../src/middleware/auth.middleware';
import { BilingualApiResponse, ErrorResponse } from '../../../shared/interfaces/response.interface';
import { ErrorCodes } from '../../../shared/constants/error-codes';
import { EGYPT_BOUNDARIES } from '../../../location-service/src/interfaces/location.interface';

// Test constants
const VALID_EGYPTIAN_LOCATION = {
  latitude: 30.0444,  // Cairo coordinates
  longitude: 31.2357
};

const INVALID_LOCATION = {
  latitude: 40.7128,  // New York coordinates
  longitude: -74.0060
};

const VALID_EGYPTIAN_PHONE = '01234567890';
const VALID_EGYPTIAN_NATIONAL_ID = '12345678901234';
const VALID_EGYPTIAN_TAX_ID = '123456789';
const VALID_COMMERCIAL_REGISTER = '123456';

describe('Egyptian Map of Pi Auth Routes', () => {
  let app: Express;
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/auth', router);
    request = supertest(app);

    // Mock authentication middleware
    jest.mock('../../src/middleware/auth.middleware', () => ({
      authenticate: jest.fn((req, res, next) => next()),
      validateEgyptLocation: jest.fn((req, res, next) => next())
    }));
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  describe('Pi Network Authentication with Egyptian Location', () => {
    test('should authenticate user with valid Pi token and Egyptian location', async () => {
      const response = await request
        .post('/auth/pi')
        .send({
          accessToken: 'valid.pi.token',
          piId: 'valid_pi_id',
          deviceId: 'valid_device_id',
          location: VALID_EGYPTIAN_LOCATION
        });

      expect(response.status).toBe(200);
      const body = response.body as BilingualApiResponse;
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('accessToken');
      expect(body.data).toHaveProperty('refreshToken');
      expect(body.message).toBeTruthy();
      expect(body.messageAr).toBeTruthy();
    });

    test('should reject authentication from outside Egypt', async () => {
      const response = await request
        .post('/auth/pi')
        .send({
          accessToken: 'valid.pi.token',
          piId: 'valid_pi_id',
          deviceId: 'valid_device_id',
          location: INVALID_LOCATION
        });

      expect(response.status).toBe(403);
      const error = response.body as ErrorResponse;
      expect(error.code).toBe(ErrorCodes.AUTH_LOCATION_RESTRICTED);
      expect(error.message).toBeTruthy();
      expect(error.messageAr).toBeTruthy();
    });

    test('should enforce rate limiting on authentication attempts', async () => {
      // Make multiple requests to trigger rate limit
      for (let i = 0; i < 6; i++) {
        await request.post('/auth/pi').send({
          accessToken: 'valid.pi.token',
          piId: 'valid_pi_id',
          deviceId: 'valid_device_id',
          location: VALID_EGYPTIAN_LOCATION
        });
      }

      const response = await request
        .post('/auth/pi')
        .send({
          accessToken: 'valid.pi.token',
          piId: 'valid_pi_id',
          deviceId: 'valid_device_id',
          location: VALID_EGYPTIAN_LOCATION
        });

      expect(response.status).toBe(429);
      const error = response.body as ErrorResponse;
      expect(error.code).toBe(ErrorCodes.SECURITY_RATE_LIMIT_EXCEEDED);
    });
  });

  describe('Egyptian KYC Verification', () => {
    test('should validate Egyptian national ID and phone number', async () => {
      const response = await request
        .post('/auth/kyc/egyptian')
        .send({
          nationalId: VALID_EGYPTIAN_NATIONAL_ID,
          phoneNumber: VALID_EGYPTIAN_PHONE,
          addressArabic: 'عنوان تجريبي في القاهرة',
          addressEnglish: 'Sample address in Cairo',
          governorate: 'Cairo',
          postalCode: '12345'
        });

      expect(response.status).toBe(200);
      const body = response.body as BilingualApiResponse;
      expect(body.success).toBe(true);
      expect(body.data.kycStatus).toBe('VERIFIED');
    });

    test('should reject invalid Egyptian national ID format', async () => {
      const response = await request
        .post('/auth/kyc/egyptian')
        .send({
          nationalId: '123', // Invalid format
          phoneNumber: VALID_EGYPTIAN_PHONE,
          addressArabic: 'عنوان تجريبي',
          addressEnglish: 'Sample address',
          governorate: 'Cairo',
          postalCode: '12345'
        });

      expect(response.status).toBe(400);
      const error = response.body as ErrorResponse;
      expect(error.code).toBe(ErrorCodes.DATA_VALIDATION_FAILED);
    });

    test('should validate Egyptian address format', async () => {
      const response = await request
        .post('/auth/kyc/egyptian')
        .send({
          nationalId: VALID_EGYPTIAN_NATIONAL_ID,
          phoneNumber: VALID_EGYPTIAN_PHONE,
          addressArabic: '123', // Invalid Arabic address
          addressEnglish: 'Sample address',
          governorate: 'Cairo',
          postalCode: '12345'
        });

      expect(response.status).toBe(400);
      const error = response.body as ErrorResponse;
      expect(error.code).toBe(ErrorCodes.DATA_VALIDATION_FAILED);
    });
  });

  describe('Egyptian Merchant Registration', () => {
    test('should register merchant with valid Egyptian business documents', async () => {
      const response = await request
        .post('/auth/merchant/egyptian')
        .send({
          businessNameArabic: 'متجر تجريبي',
          businessNameEnglish: 'Sample Store',
          businessType: 'sole_proprietorship',
          taxNumber: VALID_EGYPTIAN_TAX_ID,
          commercialRegister: VALID_COMMERCIAL_REGISTER,
          governorate: 'Cairo',
          acceptsTerms: true
        });

      expect(response.status).toBe(201);
      const body = response.body as BilingualApiResponse;
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('merchantId');
      expect(body.data.roles).toContain('merchant');
    });

    test('should validate Egyptian tax ID format', async () => {
      const response = await request
        .post('/auth/merchant/egyptian')
        .send({
          businessNameArabic: 'متجر تجريبي',
          businessNameEnglish: 'Sample Store',
          businessType: 'sole_proprietorship',
          taxNumber: '123', // Invalid format
          commercialRegister: VALID_COMMERCIAL_REGISTER,
          governorate: 'Cairo',
          acceptsTerms: true
        });

      expect(response.status).toBe(400);
      const error = response.body as ErrorResponse;
      expect(error.code).toBe(ErrorCodes.DATA_VALIDATION_FAILED);
    });

    test('should require Arabic business name', async () => {
      const response = await request
        .post('/auth/merchant/egyptian')
        .send({
          businessNameArabic: 'Sample Store', // Not Arabic
          businessNameEnglish: 'Sample Store',
          businessType: 'sole_proprietorship',
          taxNumber: VALID_EGYPTIAN_TAX_ID,
          commercialRegister: VALID_COMMERCIAL_REGISTER,
          governorate: 'Cairo',
          acceptsTerms: true
        });

      expect(response.status).toBe(400);
      const error = response.body as ErrorResponse;
      expect(error.code).toBe(ErrorCodes.DATA_VALIDATION_FAILED);
    });
  });

  describe('Location Validation', () => {
    test('should validate coordinates within Egypt', () => {
      const isValid = validateEgyptLocation({
        coordinates: VALID_EGYPTIAN_LOCATION
      });
      expect(isValid).toBe(true);
    });

    test('should reject coordinates outside Egypt', () => {
      const isValid = validateEgyptLocation({
        coordinates: INVALID_LOCATION
      });
      expect(isValid).toBe(false);
    });

    test('should validate Egyptian governorate boundaries', () => {
      const isWithinBounds = (lat: number, lng: number) => 
        lat >= EGYPT_BOUNDARIES.minLatitude &&
        lat <= EGYPT_BOUNDARIES.maxLatitude &&
        lng >= EGYPT_BOUNDARIES.minLongitude &&
        lng <= EGYPT_BOUNDARIES.maxLongitude;

      expect(isWithinBounds(VALID_EGYPTIAN_LOCATION.latitude, VALID_EGYPTIAN_LOCATION.longitude)).toBe(true);
      expect(isWithinBounds(INVALID_LOCATION.latitude, INVALID_LOCATION.longitude)).toBe(false);
    });
  });
});