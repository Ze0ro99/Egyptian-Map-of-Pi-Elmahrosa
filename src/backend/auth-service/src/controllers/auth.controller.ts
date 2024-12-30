/**
 * @fileoverview Enhanced authentication controller for Egyptian Map of Pi marketplace
 * Implements secure authentication flows with Egyptian market compliance,
 * location validation, and bilingual support.
 * 
 * @version 1.0.0
 */

import { injectable } from 'inversify'; // ^6.0.0
import { Request, Response } from 'express'; // ^4.18.0
import { PiAuthService } from '../services/pi-auth.service';
import { TokenService } from '../services/token.service';
import { ErrorCodes } from '../../../shared/constants/error-codes';
import { 
  PiAuthPayload, 
  AuthResponse, 
  JwtCustomPayload 
} from '../interfaces/auth.interface';
import { Location, EGYPT_BOUNDARIES } from '../../../location-service/src/interfaces/location.interface';

/**
 * Enhanced authentication controller with Egyptian market compliance
 * Implements comprehensive security measures and location validation
 */
@injectable()
export class AuthController {
  constructor(
    private readonly piAuthService: PiAuthService,
    private readonly tokenService: TokenService
  ) {}

  /**
   * Handles Pi Network authentication with Egyptian compliance checks
   * Implements location validation and enhanced security measures
   * 
   * @param req Express request object containing Pi auth payload
   * @param res Express response object
   * @returns Authentication response with enhanced security tokens
   */
  public async authenticate(req: Request, res: Response): Promise<Response> {
    try {
      const authPayload: PiAuthPayload = req.body;
      const deviceInfo = {
        deviceId: req.headers['x-device-id'] as string,
        userAgent: req.headers['user-agent'] as string,
        ipAddress: req.ip,
        platform: req.headers['x-platform'] as string,
        appVersion: req.headers['x-app-version'] as string
      };

      // Validate location data
      const location: Location = req.body.location;
      if (!this.isLocationWithinEgypt(location)) {
        return res.status(403).json({
          success: false,
          error: {
            code: ErrorCodes.SECURITY_INVALID_ACCESS,
            message: {
              ar: 'عذراً، هذه الخدمة متاحة فقط داخل جمهورية مصر العربية',
              en: 'Sorry, this service is only available within Egypt'
            },
            details: [],
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] as string
          }
        });
      }

      // Authenticate user with enhanced security
      const authResponse: AuthResponse = await this.piAuthService.authenticateUser(
        authPayload,
        deviceInfo,
        location
      );

      return res.status(200).json({
        success: true,
        data: authResponse,
        error: null,
        pagination: null
      });
    } catch (error) {
      return this.handleAuthError(error, req, res);
    }
  }

  /**
   * Refreshes authentication tokens with enhanced validation
   * 
   * @param req Express request object containing refresh token
   * @param res Express response object
   * @returns New token pair with enhanced security
   */
  public async refreshToken(req: Request, res: Response): Promise<Response> {
    try {
      const { refreshToken } = req.body;
      const deviceInfo = {
        deviceId: req.headers['x-device-id'] as string,
        userAgent: req.headers['user-agent'] as string,
        ipAddress: req.ip,
        platform: req.headers['x-platform'] as string,
        appVersion: req.headers['x-app-version'] as string
      };

      const tokens = await this.tokenService.refreshTokens(refreshToken, deviceInfo);

      return res.status(200).json({
        success: true,
        data: tokens,
        error: null,
        pagination: null
      });
    } catch (error) {
      return this.handleAuthError(error, req, res);
    }
  }

  /**
   * Handles secure logout with enhanced session cleanup
   * 
   * @param req Express request object containing access token
   * @param res Express response object
   * @returns Logout confirmation
   */
  public async logout(req: Request, res: Response): Promise<Response> {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        throw new Error(ErrorCodes.AUTH_MISSING_TOKEN.toString());
      }

      await this.tokenService.revokeToken(token);

      return res.status(200).json({
        success: true,
        data: {
          message: {
            ar: 'تم تسجيل الخروج بنجاح',
            en: 'Successfully logged out'
          }
        },
        error: null,
        pagination: null
      });
    } catch (error) {
      return this.handleAuthError(error, req, res);
    }
  }

  /**
   * Verifies token with enhanced security validation
   * 
   * @param req Express request object containing token
   * @param res Express response object
   * @returns Token verification result
   */
  public async verifyToken(req: Request, res: Response): Promise<Response> {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        throw new Error(ErrorCodes.AUTH_MISSING_TOKEN.toString());
      }

      const deviceInfo = {
        deviceId: req.headers['x-device-id'] as string,
        userAgent: req.headers['user-agent'] as string,
        ipAddress: req.ip,
        platform: req.headers['x-platform'] as string,
        appVersion: req.headers['x-app-version'] as string
      };

      const decoded: JwtCustomPayload = await this.tokenService.verifyToken(token, deviceInfo);

      return res.status(200).json({
        success: true,
        data: {
          valid: true,
          payload: decoded
        },
        error: null,
        pagination: null
      });
    } catch (error) {
      return this.handleAuthError(error, req, res);
    }
  }

  /**
   * Validates if location is within Egyptian boundaries
   * 
   * @param location Location to validate
   * @returns boolean indicating if location is valid
   */
  private isLocationWithinEgypt(location: Location): boolean {
    const { latitude, longitude } = location.coordinates;
    return (
      latitude >= EGYPT_BOUNDARIES.minLatitude &&
      latitude <= EGYPT_BOUNDARIES.maxLatitude &&
      longitude >= EGYPT_BOUNDARIES.minLongitude &&
      longitude <= EGYPT_BOUNDARIES.maxLongitude
    );
  }

  /**
   * Handles authentication errors with bilingual messages
   * 
   * @param error Error object
   * @param req Express request object
   * @param res Express response object
   * @returns Error response with bilingual messages
   */
  private handleAuthError(error: any, req: Request, res: Response): Response {
    const errorCode = parseInt(error.message) || ErrorCodes.SYSTEM_INTERNAL_ERROR;
    const errorMessages = this.getErrorMessage(errorCode);

    return res.status(this.getHttpStatus(errorCode)).json({
      success: false,
      data: null,
      error: {
        code: errorCode,
        message: errorMessages,
        details: [],
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      },
      pagination: null
    });
  }

  /**
   * Gets bilingual error messages based on error code
   * 
   * @param errorCode Error code to get messages for
   * @returns Bilingual error messages
   */
  private getErrorMessage(errorCode: number): { ar: string; en: string } {
    const messages: Record<number, { ar: string; en: string }> = {
      [ErrorCodes.AUTH_INVALID_TOKEN]: {
        ar: 'رمز المصادقة غير صالح',
        en: 'Invalid authentication token'
      },
      [ErrorCodes.AUTH_EXPIRED_TOKEN]: {
        ar: 'انتهت صلاحية رمز المصادقة',
        en: 'Authentication token expired'
      },
      [ErrorCodes.AUTH_MISSING_TOKEN]: {
        ar: 'رمز المصادقة مفقود',
        en: 'Missing authentication token'
      },
      [ErrorCodes.AUTH_KYC_REQUIRED]: {
        ar: 'مطلوب التحقق من الهوية',
        en: 'KYC verification required'
      },
      [ErrorCodes.SECURITY_INVALID_ACCESS]: {
        ar: 'محاولة وصول غير صالحة',
        en: 'Invalid access attempt'
      }
    };

    return messages[errorCode] || {
      ar: 'حدث خطأ في النظام',
      en: 'System error occurred'
    };
  }

  /**
   * Maps error codes to HTTP status codes
   * 
   * @param errorCode Error code to map
   * @returns Corresponding HTTP status code
   */
  private getHttpStatus(errorCode: number): number {
    const statusMap: Record<number, number> = {
      [ErrorCodes.AUTH_INVALID_TOKEN]: 401,
      [ErrorCodes.AUTH_EXPIRED_TOKEN]: 401,
      [ErrorCodes.AUTH_MISSING_TOKEN]: 401,
      [ErrorCodes.AUTH_KYC_REQUIRED]: 403,
      [ErrorCodes.SECURITY_INVALID_ACCESS]: 403
    };

    return statusMap[errorCode] || 500;
  }
}