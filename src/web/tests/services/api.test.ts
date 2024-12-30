/**
 * @fileoverview Test suite for Egyptian Map of Pi API service
 * @version 1.0.0
 * 
 * Tests API client functionality with focus on Egyptian market requirements,
 * bilingual support, and regional network considerations.
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'; // ^29.0.0
import axios from 'axios'; // ^1.5.0
import MockAdapter from 'axios-mock-adapter'; // ^1.21.5
import { ApiService } from '../../src/services/api.service';
import { apiConfig } from '../../src/config/api.config';
import { ErrorCodes } from '../../../backend/shared/constants/error-codes';
import { getLocalStorage, setLocalStorage, clearStorage, StorageType } from '../../src/utils/storage.util';

// Initialize mocks
const mockAxios = new MockAdapter(axios);
let apiService: ApiService;

// Test data constants
const TEST_ENDPOINT = '/listings';
const TEST_AUTH_TOKEN = 'test_token';
const TEST_LISTING_DATA = {
  title_ar: 'تجربة',
  title_en: 'Test',
  price: 100,
  location: { lat: 30.0444, lng: 31.2357 } // Cairo coordinates
};

describe('ApiService - Egyptian Market Integration', () => {
  beforeEach(() => {
    // Reset mocks and storage
    mockAxios.reset();
    clearStorage(StorageType.LOCAL);
    
    // Initialize API service
    apiService = new ApiService();
    
    // Set test auth token
    setLocalStorage('auth_token', TEST_AUTH_TOKEN, true);
  });

  afterEach(() => {
    mockAxios.reset();
    clearStorage(StorageType.LOCAL);
    jest.clearAllMocks();
  });

  describe('Constructor and Configuration', () => {
    test('should initialize with Egyptian market configuration', () => {
      expect(apiService['client'].defaults.baseURL).toBe(apiConfig.baseURL);
      expect(apiService['client'].defaults.timeout).toBe(apiConfig.timeout);
      expect(apiService['client'].defaults.headers['Accept-Language']).toBe('ar,en');
      expect(apiService['client'].defaults.headers['X-Region']).toBe('EG');
    });

    test('should configure retry mechanism for Egyptian network conditions', () => {
      const retryConfig = apiConfig.retry;
      expect(retryConfig.maxRetries).toBe(3);
      expect(retryConfig.initialRetryDelay).toBe(1000);
      expect(retryConfig.maxRetryDelay).toBe(10000);
    });
  });

  describe('Request Handling', () => {
    test('should handle successful GET request with bilingual response', async () => {
      const mockResponse = {
        success: true,
        data: TEST_LISTING_DATA,
        messageAr: 'تم بنجاح',
        messageEn: 'Success',
        statusCode: 200
      };

      mockAxios.onGet(TEST_ENDPOINT).reply(200, mockResponse);

      const response = await apiService.get(TEST_ENDPOINT);
      expect(response.success).toBe(true);
      expect(response.data).toEqual(TEST_LISTING_DATA);
      expect(response.messageAr).toBe('تم بنجاح');
      expect(response.messageEn).toBe('Success');
    });

    test('should handle POST request with Arabic content', async () => {
      mockAxios.onPost(TEST_ENDPOINT, TEST_LISTING_DATA).reply(201);

      const response = await apiService.post(TEST_ENDPOINT, TEST_LISTING_DATA);
      expect(response.success).toBe(true);
      expect(mockAxios.history.post[0].headers['Content-Type']).toBe('application/json');
      expect(mockAxios.history.post[0].headers['Accept-Language']).toBe('ar,en');
    });

    test('should deduplicate concurrent requests', async () => {
      mockAxios.onGet(TEST_ENDPOINT).reply(200, { data: TEST_LISTING_DATA });

      const [response1, response2] = await Promise.all([
        apiService.get(TEST_ENDPOINT),
        apiService.get(TEST_ENDPOINT)
      ]);

      expect(mockAxios.history.get.length).toBe(1);
      expect(response1).toEqual(response2);
    });
  });

  describe('Error Handling', () => {
    test('should handle network timeout with Arabic error message', async () => {
      mockAxios.onGet(TEST_ENDPOINT).timeout();

      try {
        await apiService.get(TEST_ENDPOINT);
        fail('Should have thrown timeout error');
      } catch (error) {
        expect(error.messageAr).toBe('انتهت مهلة الطلب. يرجى المحاولة مرة أخرى');
        expect(error.errorCode).toBe(ErrorCodes.NETWORK_TIMEOUT);
      }
    });

    test('should handle validation errors with bilingual messages', async () => {
      const errorResponse = {
        errorCode: ErrorCodes.DATA_VALIDATION_FAILED,
        messageAr: 'بيانات غير صالحة',
        messageEn: 'Invalid data'
      };

      mockAxios.onPost(TEST_ENDPOINT).reply(400, errorResponse);

      try {
        await apiService.post(TEST_ENDPOINT, {});
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.messageAr).toBe('بيانات غير صالحة');
        expect(error.messageEn).toBe('Invalid data');
        expect(error.statusCode).toBe(400);
      }
    });

    test('should implement retry mechanism for network issues', async () => {
      let attempts = 0;
      mockAxios.onGet(TEST_ENDPOINT).reply(() => {
        attempts++;
        return attempts < 3 ? [500, {}] : [200, { data: TEST_LISTING_DATA }];
      });

      const response = await apiService.get(TEST_ENDPOINT);
      expect(attempts).toBe(3);
      expect(response.data).toEqual(TEST_LISTING_DATA);
    });
  });

  describe('Security Features', () => {
    test('should include security headers for Egyptian compliance', async () => {
      mockAxios.onGet(TEST_ENDPOINT).reply(200, { data: {} });

      await apiService.get(TEST_ENDPOINT);
      const headers = mockAxios.history.get[0].headers;

      expect(headers['Authorization']).toBe(`Bearer ${TEST_AUTH_TOKEN}`);
      expect(headers['X-Region']).toBe('EG');
      expect(headers['X-Request-Time']).toBeDefined();
    });

    test('should handle rate limiting errors', async () => {
      const rateLimitError = {
        errorCode: ErrorCodes.SECURITY_RATE_LIMIT_EXCEEDED,
        messageAr: 'تم تجاوز حد الطلبات',
        messageEn: 'Rate limit exceeded'
      };

      mockAxios.onGet(TEST_ENDPOINT).reply(429, rateLimitError);

      try {
        await apiService.get(TEST_ENDPOINT);
        fail('Should have thrown rate limit error');
      } catch (error) {
        expect(error.errorCode).toBe(ErrorCodes.SECURITY_RATE_LIMIT_EXCEEDED);
        expect(error.statusCode).toBe(429);
      }
    });
  });

  describe('Regional Network Optimization', () => {
    test('should handle slow Egyptian network conditions', async () => {
      mockAxios.onGet(TEST_ENDPOINT).reply(async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return [200, { data: TEST_LISTING_DATA }];
      });

      const response = await apiService.get(TEST_ENDPOINT);
      expect(response.data).toEqual(TEST_LISTING_DATA);
    });

    test('should optimize request caching for high latency', async () => {
      const cacheKey = apiService['getCacheKey']({
        method: 'GET',
        url: TEST_ENDPOINT
      });

      expect(cacheKey).toBe(`GET_${TEST_ENDPOINT}_undefined`);
    });
  });
});