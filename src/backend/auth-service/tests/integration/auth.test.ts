/**
 * @fileoverview Integration tests for Egyptian Map of Pi authentication service
 * Tests authentication flows, location validation, and merchant-specific features
 * @version 1.0.0
 */

import request from 'supertest'; // ^6.3.0
import { describe, it, beforeEach, afterEach, jest, expect } from 'jest'; // ^29.0.0
import { AuthController } from '../../src/controllers/auth.controller';
import { PiAuthService } from '../../src/services/pi-auth.service';
import { UserModel } from '../../src/models/user.model';
import { EGYPT_BOUNDARIES } from '../../../location-service/src/interfaces/location.interface';
import { ErrorCodes } from '../../../shared/constants/error-codes';

// Mock device fingerprinting
jest.mock('@fingerprintjs/fingerprintjs-pro', () => ({
  MockDeviceFingerprint: jest.fn().mockImplementation(() => ({
    get: () => Promise.resolve({ visitorId: 'test-device-id' })
  }))
}));

describe('Auth Integration Tests', () => {
  let app: any;
  let authController: AuthController;
  let piAuthService: PiAuthService;
  let mockPiToken: string;
  let mockDeviceInfo: any;

  // Test data constants
  const TEST_USER = {
    piId: 'test-pi-id',
    username: 'testuser',
    nameAr: 'مستخدم تجريبي',
    nameEn: 'Test User',
    location: {
      coordinates: {
        latitude: 30.0444,  // Cairo coordinates
        longitude: 31.2357,
        accuracy: 10
      },
      address: {
        streetAr: 'شارع التحرير',
        streetEn: 'Tahrir Street',
        cityAr: 'القاهرة',
        cityEn: 'Cairo',
        governorateAr: 'القاهرة',
        governorateEn: 'Cairo',
        postalCode: '11511'
      },
      type: 'DELIVERY_ADDRESS'
    }
  };

  const TEST_MERCHANT = {
    ...TEST_USER,
    isMerchant: true,
    merchantDetails: {
      businessName: {
        ar: 'متجر تجريبي',
        en: 'Test Store'
      },
      commercialRegister: 'CR123456',
      taxId: 'TAX123456',
      businessType: 'RETAIL',
      operatingHours: {
        open: '09:00',
        close: '21:00',
        days: [0, 1, 2, 3, 4, 5, 6]
      }
    }
  };

  beforeEach(async () => {
    // Initialize test app and dependencies
    app = await setupTestApp();
    authController = new AuthController(piAuthService);
    mockPiToken = 'valid-pi-token';
    mockDeviceInfo = {
      deviceId: 'test-device-id',
      userAgent: 'test-user-agent',
      ipAddress: '1.1.1.1',
      platform: 'test-platform',
      appVersion: '1.0.0'
    };

    // Clear database and create test data
    await UserModel.deleteMany({});
  });

  afterEach(async () => {
    // Cleanup after tests
    await UserModel.deleteMany({});
    jest.clearAllMocks();
  });

  describe('Authentication Flow Tests', () => {
    it('should authenticate user with valid Pi Network token and Egyptian location', async () => {
      const response = await request(app)
        .post('/api/v1/auth/authenticate')
        .send({
          accessToken: mockPiToken,
          location: TEST_USER.location
        })
        .set('x-device-id', mockDeviceInfo.deviceId)
        .set('user-agent', mockDeviceInfo.userAgent)
        .set('x-platform', mockDeviceInfo.platform)
        .set('x-app-version', mockDeviceInfo.appVersion);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('sessionId');
    });

    it('should reject authentication for location outside Egypt', async () => {
      const invalidLocation = {
        coordinates: {
          latitude: 40.7128, // New York coordinates
          longitude: -74.0060,
          accuracy: 10
        }
      };

      const response = await request(app)
        .post('/api/v1/auth/authenticate')
        .send({
          accessToken: mockPiToken,
          location: invalidLocation
        })
        .set('x-device-id', mockDeviceInfo.deviceId);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCodes.SECURITY_INVALID_ACCESS);
      expect(response.body.error.message).toHaveProperty('ar');
      expect(response.body.error.message).toHaveProperty('en');
    });

    it('should handle bilingual error messages correctly', async () => {
      const response = await request(app)
        .post('/api/v1/auth/authenticate')
        .send({
          accessToken: 'invalid-token'
        });

      expect(response.status).toBe(401);
      expect(response.body.error.message.ar).toBeTruthy();
      expect(response.body.error.message.en).toBeTruthy();
    });
  });

  describe('Merchant Authentication Tests', () => {
    beforeEach(async () => {
      await UserModel.create(TEST_MERCHANT);
    });

    it('should authenticate merchant with valid KYC status', async () => {
      const response = await request(app)
        .post('/api/v1/auth/authenticate')
        .send({
          accessToken: mockPiToken,
          location: TEST_MERCHANT.location
        })
        .set('x-device-id', mockDeviceInfo.deviceId);

      expect(response.status).toBe(200);
      expect(response.body.data.roles).toContain('merchant');
      expect(response.body.data.permissions).toContain('create_listing');
    });

    it('should reject merchant without KYC verification', async () => {
      const unverifiedMerchant = {
        ...TEST_MERCHANT,
        kycStatus: 'PENDING'
      };
      await UserModel.findOneAndUpdate(
        { piId: TEST_MERCHANT.piId },
        unverifiedMerchant
      );

      const response = await request(app)
        .post('/api/v1/auth/authenticate')
        .send({
          accessToken: mockPiToken,
          location: TEST_MERCHANT.location
        })
        .set('x-device-id', mockDeviceInfo.deviceId);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe(ErrorCodes.AUTH_KYC_REQUIRED);
    });
  });

  describe('Token Management Tests', () => {
    it('should refresh tokens successfully', async () => {
      // First authenticate to get tokens
      const authResponse = await request(app)
        .post('/api/v1/auth/authenticate')
        .send({
          accessToken: mockPiToken,
          location: TEST_USER.location
        })
        .set('x-device-id', mockDeviceInfo.deviceId);

      const refreshToken = authResponse.body.data.refreshToken;

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .set('x-device-id', mockDeviceInfo.deviceId);

      expect(response.status).toBe(200);
      expect(response.body.data.accessToken).toBeTruthy();
      expect(response.body.data.refreshToken).toBeTruthy();
      expect(response.body.data.refreshToken).not.toBe(refreshToken);
    });

    it('should logout successfully', async () => {
      // First authenticate
      const authResponse = await request(app)
        .post('/api/v1/auth/authenticate')
        .send({
          accessToken: mockPiToken,
          location: TEST_USER.location
        })
        .set('x-device-id', mockDeviceInfo.deviceId);

      const token = authResponse.body.data.accessToken;

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toHaveProperty('ar');
      expect(response.body.data.message).toHaveProperty('en');
    });
  });

  describe('Security Tests', () => {
    it('should detect and reject suspicious device fingerprints', async () => {
      const suspiciousDevice = {
        ...mockDeviceInfo,
        deviceId: 'suspicious-device'
      };

      const response = await request(app)
        .post('/api/v1/auth/authenticate')
        .send({
          accessToken: mockPiToken,
          location: TEST_USER.location
        })
        .set('x-device-id', suspiciousDevice.deviceId);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe(ErrorCodes.SECURITY_INVALID_ACCESS);
    });

    it('should enforce rate limiting', async () => {
      // Make multiple requests rapidly
      const requests = Array(11).fill(null).map(() =>
        request(app)
          .post('/api/v1/auth/authenticate')
          .send({
            accessToken: mockPiToken,
            location: TEST_USER.location
          })
          .set('x-device-id', mockDeviceInfo.deviceId)
      );

      const responses = await Promise.all(requests);
      const lastResponse = responses[responses.length - 1];

      expect(lastResponse.status).toBe(429);
      expect(lastResponse.body.error.code).toBe(ErrorCodes.SECURITY_RATE_LIMIT_EXCEEDED);
    });
  });
});

/**
 * Helper function to set up test application
 */
async function setupTestApp() {
  // Implementation would initialize test server and dependencies
  // Omitted for brevity
}