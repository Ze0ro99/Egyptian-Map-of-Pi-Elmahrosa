import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../src/middleware/auth.middleware';
import errorMiddleware from '../../src/middleware/error.middleware';
import { createValidationMiddleware } from '../../src/middleware/validation.middleware';
import requestLoggingMiddleware from '../../src/middleware/logging.middleware';
import { ErrorCodes } from '../../../shared/constants/error-codes';
import { TokenService } from '../../../auth-service/src/services/token.service';
import { logger } from '../../../shared/utils/logger.util';

// Mock dependencies
jest.mock('../../../auth-service/src/services/token.service');
jest.mock('../../../shared/utils/logger.util');

describe('API Gateway Middleware Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      body: {},
      ip: '192.168.1.1',
      path: '/test',
      method: 'GET'
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn()
    };

    nextFunction = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Authentication Middleware', () => {
    let tokenService: jest.Mocked<TokenService>;

    beforeEach(() => {
      tokenService = new TokenService() as jest.Mocked<TokenService>;
    });

    test('should return AUTH_MISSING_TOKEN error when no token provided', async () => {
      const authMiddleware = authenticate(tokenService);
      await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: ErrorCodes.AUTH_MISSING_TOKEN
          })
        })
      );
    });

    test('should validate token successfully with proper authorization', async () => {
      const validToken = 'valid.jwt.token';
      mockRequest.headers = {
        authorization: `Bearer ${validToken}`,
        'x-device-id': 'test-device'
      };

      tokenService.verifyToken = jest.fn().mockResolvedValue({
        userId: 'test-user',
        piId: 'test-pi-id',
        roles: ['user']
      });

      const authMiddleware = authenticate(tokenService);
      await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.piId).toBe('test-pi-id');
    });

    test('should handle expired tokens correctly', async () => {
      mockRequest.headers = {
        authorization: 'Bearer expired.token',
        'x-device-id': 'test-device'
      };

      tokenService.verifyToken = jest.fn().mockRejectedValue(new Error(ErrorCodes.AUTH_EXPIRED_TOKEN.toString()));

      const authMiddleware = authenticate(tokenService);
      await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: ErrorCodes.AUTH_EXPIRED_TOKEN
          })
        })
      );
    });

    test('should enforce rate limiting for authentication attempts', async () => {
      // Simulate multiple rapid requests
      const authMiddleware = authenticate(tokenService);
      
      for (let i = 0; i < 6; i++) {
        await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      }

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: ErrorCodes.SECURITY_RATE_LIMIT_EXCEEDED
          })
        })
      );
    });
  });

  describe('Error Middleware', () => {
    test('should format error response with proper structure', () => {
      const error = new Error('Test error');
      error['code'] = ErrorCodes.SYSTEM_INTERNAL_ERROR;

      errorMiddleware(error, mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: ErrorCodes.SYSTEM_INTERNAL_ERROR,
            message: 'Test error'
          })
        })
      );
    });

    test('should handle validation errors with bilingual messages', () => {
      const validationError = new Error('Validation failed');
      validationError['code'] = ErrorCodes.DATA_VALIDATION_FAILED;
      validationError['details'] = ['Invalid input'];

      errorMiddleware(validationError, mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: ErrorCodes.DATA_VALIDATION_FAILED,
            message: 'Validation failed',
            details: ['Invalid input']
          })
        })
      );
    });

    test('should mask sensitive information in error responses', () => {
      const error = new Error('Authentication failed');
      error['code'] = ErrorCodes.AUTH_INVALID_TOKEN;
      error['details'] = ['Token: abc123xyz'];

      errorMiddleware(error, mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.not.stringContaining('abc123xyz')
          })
        })
      );
    });
  });

  describe('Validation Middleware', () => {
    class TestDTO {
      titleAr!: string;
      titleEn!: string;
      price!: number;
      location!: { latitude: number; longitude: number };
    }

    test('should validate Arabic content correctly', async () => {
      const validationMiddleware = createValidationMiddleware(TestDTO, {
        validateLanguageContent: true
      });

      mockRequest.body = {
        titleAr: 'عنوان تجريبي',
        titleEn: 'Test Title'
      };

      await validationMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
    });

    test('should validate Egyptian coordinates', async () => {
      const validationMiddleware = createValidationMiddleware(TestDTO, {
        validateLocation: true
      });

      mockRequest.body = {
        location: {
          latitude: 30.0444,
          longitude: 31.2357
        }
      };

      await validationMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
    });

    test('should validate Pi amount ranges', async () => {
      const validationMiddleware = createValidationMiddleware(TestDTO, {
        validatePiAmount: true
      });

      mockRequest.body = {
        price: 100.5
      };

      await validationMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('Logging Middleware', () => {
    test('should log request details with proper format', () => {
      requestLoggingMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(logger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          method: 'GET',
          url: expect.any(String),
          requestId: expect.any(String)
        }),
        expect.any(String)
      );
    });

    test('should track request performance metrics', () => {
      requestLoggingMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Simulate response
      mockResponse.json?.call(mockResponse, { success: true, data: {} });

      expect(logger.info).toHaveBeenCalledWith(
        'Request completed',
        expect.objectContaining({
          duration: expect.any(String),
          metrics: expect.objectContaining({
            processingTime: expect.any(Number)
          })
        }),
        expect.any(String)
      );
    });

    test('should mask sensitive data in logs', () => {
      mockRequest.headers = {
        authorization: 'Bearer token123',
        'x-api-key': 'secret-key'
      };

      requestLoggingMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(logger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: '[REDACTED]',
            'x-api-key': '[REDACTED]'
          })
        }),
        expect.any(String)
      );
    });
  });
});