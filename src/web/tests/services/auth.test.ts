import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals'; // ^29.0.0
import { PiNetwork } from '@pi-network/sdk'; // ^2.0.0
import { render, waitFor } from '@testing-library/react'; // ^13.0.0

import { AuthService } from '../../src/services/auth.service';
import { KYCStatus, SecurityLevel } from '../../src/interfaces/auth.interface';
import { ErrorCodes } from '../../../backend/shared/constants/error-codes';
import { getErrorMessage } from '../../src/constants/errors';

// Mock dependencies
jest.mock('@pi-network/sdk');
jest.mock('../../src/api/auth.api');
jest.mock('../../src/services/storage.service');

describe('AuthService', () => {
  let authService: AuthService;
  let mockPiNetwork: jest.Mocked<typeof PiNetwork>;

  // Test data
  const mockPiUser = {
    uid: 'test_pi_id',
    username: 'test_user',
    accessToken: 'test_access_token'
  };

  const mockAuthUser = {
    piId: 'test_pi_id',
    accessToken: 'test_access_token',
    refreshToken: 'test_refresh_token',
    kycStatus: KYCStatus.VERIFIED,
    isMerchant: false,
    lastLogin: new Date(),
    securityLevel: SecurityLevel.ENHANCED,
    isActive: true,
    roles: ['user'],
    deviceId: 'test_device_id'
  };

  beforeEach(() => {
    // Reset mocks and create fresh instance
    jest.clearAllMocks();
    authService = new AuthService();
    mockPiNetwork = PiNetwork as jest.Mocked<typeof PiNetwork>;
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('authenticate', () => {
    test('should successfully authenticate with Pi Network and validate Egyptian market', async () => {
      // Arrange
      mockPiNetwork.prototype.authenticate.mockResolvedValue(mockPiUser);
      const validateEgyptianMarketSpy = jest.spyOn(authService as any, 'validateMarketAccess')
        .mockResolvedValue(true);

      // Act
      const result = await authService.authenticate();

      // Assert
      expect(result).toBeDefined();
      expect(result.piId).toBe(mockPiUser.uid);
      expect(validateEgyptianMarketSpy).toHaveBeenCalledWith(mockPiUser.uid);
      expect(localStorage.getItem('auth_token')).toBeDefined();
    });

    test('should fail authentication for non-Egyptian market access', async () => {
      // Arrange
      mockPiNetwork.prototype.authenticate.mockResolvedValue(mockPiUser);
      jest.spyOn(authService as any, 'validateMarketAccess')
        .mockResolvedValue(false);

      // Act & Assert
      await expect(authService.authenticate())
        .rejects
        .toThrow(getErrorMessage(ErrorCodes.SECURITY_INVALID_ACCESS, 'ar'));
    });

    test('should handle network errors with retry mechanism', async () => {
      // Arrange
      const networkError = new Error('Network error');
      mockPiNetwork.prototype.authenticate
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(mockPiUser);

      // Act
      const result = await authService.authenticate();

      // Assert
      expect(result).toBeDefined();
      expect(mockPiNetwork.prototype.authenticate).toHaveBeenCalledTimes(2);
    });
  });

  describe('verifyEgyptianKYC', () => {
    test('should successfully complete KYC verification for Egyptian users', async () => {
      // Arrange
      const mockKYCData = {
        nationalId: '12345678901234',
        documentType: 'egyptian_id',
        documentImages: ['front.jpg', 'back.jpg']
      };

      // Act
      await authService.verifyKYC();

      // Assert
      expect(authService.getCurrentUser()?.kycStatus).toBe(KYCStatus.VERIFIED);
    });

    test('should handle invalid Egyptian documentation', async () => {
      // Arrange
      const invalidKYCData = {
        nationalId: 'invalid',
        documentType: 'egyptian_id',
        documentImages: []
      };

      // Act & Assert
      await expect(authService.verifyKYC())
        .rejects
        .toThrow(getErrorMessage(ErrorCodes.AUTH_KYC_REQUIRED, 'ar'));
    });
  });

  describe('refreshTokens', () => {
    test('should successfully refresh authentication tokens', async () => {
      // Arrange
      const mockNewTokens = {
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
        expiresIn: 3600
      };

      // Act
      const result = await authService.refreshTokens();

      // Assert
      expect(result.accessToken).toBe(mockNewTokens.accessToken);
      expect(localStorage.getItem('auth_token')).toBe(mockNewTokens.accessToken);
    });

    test('should handle expired refresh tokens', async () => {
      // Act & Assert
      await expect(authService.refreshTokens())
        .rejects
        .toThrow(getErrorMessage(ErrorCodes.AUTH_EXPIRED_TOKEN, 'ar'));
    });
  });

  describe('checkKYCStatus', () => {
    test('should return current KYC status for Egyptian verification', async () => {
      // Arrange
      authService['currentUser'] = mockAuthUser;

      // Act
      const status = await authService.checkKYCStatus();

      // Assert
      expect(status).toBe(KYCStatus.VERIFIED);
    });

    test('should handle unauthenticated KYC status check', async () => {
      // Arrange
      authService['currentUser'] = null;

      // Act & Assert
      await expect(authService.checkKYCStatus())
        .rejects
        .toThrow(getErrorMessage(ErrorCodes.AUTH_NOT_AUTHENTICATED, 'ar'));
    });
  });

  describe('logout', () => {
    test('should successfully clear authentication state', () => {
      // Arrange
      localStorage.setItem('auth_token', 'test_token');
      authService['currentUser'] = mockAuthUser;

      // Act
      authService.logout();

      // Assert
      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(authService.getCurrentUser()).toBeNull();
    });
  });

  describe('security context', () => {
    test('should maintain secure device tracking', () => {
      // Arrange
      const deviceId = authService['securityContext'].deviceId;

      // Act
      authService.authenticate();

      // Assert
      expect(authService['securityContext'].deviceId).toBe(deviceId);
      expect(authService['securityContext'].platform).toBeDefined();
    });

    test('should handle suspicious device changes', async () => {
      // Arrange
      const originalDeviceId = authService['securityContext'].deviceId;
      authService['securityContext'].deviceId = 'different_device';

      // Act & Assert
      await expect(authService.authenticate())
        .rejects
        .toThrow(getErrorMessage(ErrorCodes.SECURITY_INVALID_ACCESS, 'ar'));
    });
  });

  describe('bilingual support', () => {
    test('should handle Arabic error messages', async () => {
      // Act & Assert
      await expect(authService.authenticate())
        .rejects
        .toThrow(/[\u0600-\u06FF]/); // Arabic Unicode range
    });

    test('should support English error messages', async () => {
      // Arrange
      const originalLanguage = localStorage.getItem('language');
      localStorage.setItem('language', 'en');

      // Act & Assert
      try {
        await authService.authenticate();
      } catch (error) {
        expect(error.message).toMatch(/^[A-Za-z\s.]+$/);
      }

      // Cleanup
      if (originalLanguage) {
        localStorage.setItem('language', originalLanguage);
      }
    });
  });
});