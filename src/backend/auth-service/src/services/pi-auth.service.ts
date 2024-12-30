/**
 * @fileoverview Enhanced Pi Network authentication service for Egyptian Map of Pi
 * Implements secure user authentication with device fingerprinting, location validation,
 * and Egyptian market-specific security features.
 * @version 1.0.0
 */

import { injectable } from 'inversify'; // ^6.0.1
import axios from 'axios'; // ^1.5.0
import winston from 'winston'; // ^3.8.0
import { RateLimiterRedis } from 'rate-limiter-flexible'; // ^2.4.1

import { 
  PiAuthPayload, 
  AuthToken, 
  AuthSession, 
  AuthResponse, 
  JwtCustomPayload 
} from '../interfaces/auth.interface';
import { piNetworkConfig } from '../config/pi-network.config';
import { UserModel, UserDocument } from '../models/user.model';
import { ErrorCodes } from '../../../shared/constants/error-codes';
import { Location, EGYPT_BOUNDARIES } from '../../../location-service/src/interfaces/location.interface';

/**
 * Interface for device information used in authentication
 */
interface DeviceInfo {
  deviceId: string;
  deviceFingerprint: string;
  userAgent: string;
  ipAddress: string;
}

/**
 * Interface for security validation result
 */
interface SecurityValidation {
  isValid: boolean;
  riskScore: number;
  restrictionReason?: string;
}

/**
 * Enhanced Pi Network authentication service with Egyptian market security features
 */
@injectable()
export class PiAuthService {
  constructor(
    private readonly userModel: typeof UserModel,
    private readonly tokenService: TokenService,
    private readonly kycService: KYCService,
    private readonly logger: winston.Logger,
    private readonly rateLimiter: RateLimiterRedis,
    private readonly deviceVerifier: DeviceVerificationService,
    private readonly locationValidator: LocationValidationService
  ) {}

  /**
   * Authenticates a user with enhanced security validation
   * @param authPayload - Pi Network authentication payload
   * @param deviceInfo - Device fingerprinting information
   * @param location - User's geographic location
   * @returns Authentication response with tokens and session data
   */
  public async authenticateUser(
    authPayload: PiAuthPayload,
    deviceInfo: DeviceInfo,
    location: Location
  ): Promise<AuthResponse> {
    try {
      // Rate limiting check
      await this.checkRateLimit(deviceInfo.ipAddress);

      // Validate location is within Egypt
      if (!this.isLocationWithinEgypt(location)) {
        throw new Error(ErrorCodes.SECURITY_INVALID_ACCESS.toString());
      }

      // Verify device fingerprint
      const deviceValidation = await this.deviceVerifier.verifyDevice(deviceInfo);
      if (!deviceValidation.isValid) {
        this.logger.warn('Suspicious device detected', { deviceInfo });
        throw new Error(ErrorCodes.SECURITY_INVALID_ACCESS.toString());
      }

      // Validate Pi Network authentication
      const piValidation = await this.validatePiAuthentication(authPayload);
      if (!piValidation) {
        throw new Error(ErrorCodes.AUTH_INVALID_TOKEN.toString());
      }

      // Find or create user
      let user = await this.userModel.findByPiId(authPayload.piId);
      if (!user) {
        user = await this.createNewUser(authPayload, location);
      }

      // Verify KYC status
      const kycValidation = await this.kycService.validateUserKyc(user.id);
      if (!kycValidation.isValid && user.isMerchant) {
        throw new Error(ErrorCodes.AUTH_KYC_REQUIRED.toString());
      }

      // Create authentication session
      const session = await this.createAuthSession(user, deviceInfo);

      // Generate tokens
      const tokens = await this.tokenService.generateTokens({
        userId: user.id,
        piId: user.piId,
        roles: user.roles,
        sessionId: session.id,
        deviceId: deviceInfo.deviceId,
        isMerchant: user.isMerchant
      });

      // Update user's last login
      await this.userModel.findByIdAndUpdate(user.id, {
        lastLoginAt: new Date(),
        deviceId: deviceInfo.deviceId
      });

      // Log successful authentication
      this.logger.info('User authenticated successfully', {
        userId: user.id,
        piId: user.piId,
        deviceId: deviceInfo.deviceId
      });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: piNetworkConfig.security.tokenExpirySeconds,
        tokenType: 'Bearer',
        sessionId: session.id,
        roles: user.roles,
        permissions: await this.getUserPermissions(user),
        requiresKyc: !kycValidation.isValid
      };
    } catch (error) {
      this.logger.error('Authentication failed', { error });
      throw error;
    }
  }

  /**
   * Verifies user's security profile for Egyptian market
   * @param userId - User identifier
   * @param context - Security context information
   * @returns Security validation result
   */
  public async verifySecurityProfile(
    userId: string,
    context: SecurityContext
  ): Promise<SecurityValidation> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new Error(ErrorCodes.DATA_NOT_FOUND.toString());
      }

      // Validate device trust score
      const deviceTrust = await this.deviceVerifier.getTrustScore(context.deviceId);
      if (deviceTrust.score < piNetworkConfig.security.minDeviceTrustScore) {
        return {
          isValid: false,
          riskScore: deviceTrust.score,
          restrictionReason: 'Untrusted device'
        };
      }

      // Validate location restrictions
      const locationValid = await this.locationValidator.validateUserLocation(
        user.id,
        context.location
      );
      if (!locationValid) {
        return {
          isValid: false,
          riskScore: 1.0,
          restrictionReason: 'Location restricted'
        };
      }

      // Check merchant-specific security requirements
      if (user.isMerchant) {
        const merchantValidation = await this.validateMerchantSecurity(user);
        if (!merchantValidation.isValid) {
          return merchantValidation;
        }
      }

      return {
        isValid: true,
        riskScore: 0.0
      };
    } catch (error) {
      this.logger.error('Security profile verification failed', { error });
      throw error;
    }
  }

  /**
   * Validates if location is within Egyptian boundaries
   * @param location - Geographic location to validate
   * @returns True if location is within Egypt
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
   * Creates a new user from Pi Network authentication
   * @param authPayload - Pi Network authentication payload
   * @param location - User's geographic location
   * @returns Created user document
   */
  private async createNewUser(
    authPayload: PiAuthPayload,
    location: Location
  ): Promise<UserDocument> {
    return await this.userModel.create({
      piId: authPayload.piId,
      username: authPayload.username,
      roles: ['user'],
      location,
      kycStatus: 'PENDING',
      language: 'ar',
      isActive: true
    });
  }

  /**
   * Creates an authentication session
   * @param user - User document
   * @param deviceInfo - Device information
   * @returns Created session
   */
  private async createAuthSession(
    user: UserDocument,
    deviceInfo: DeviceInfo
  ): Promise<AuthSession> {
    return await this.tokenService.createSession({
      userId: user.id,
      deviceId: deviceInfo.deviceId,
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent
    });
  }

  /**
   * Validates Pi Network authentication payload
   * @param authPayload - Authentication payload to validate
   * @returns True if authentication is valid
   */
  private async validatePiAuthentication(
    authPayload: PiAuthPayload
  ): Promise<boolean> {
    try {
      const response = await axios.post(
        `${piNetworkConfig.apiEndpoint}/v2/auth/verify`,
        { token: authPayload.accessToken },
        {
          headers: {
            'Authorization': `Key ${piNetworkConfig.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data.verified;
    } catch (error) {
      this.logger.error('Pi Network authentication validation failed', { error });
      return false;
    }
  }

  /**
   * Checks rate limiting for authentication attempts
   * @param ipAddress - IP address to check
   * @throws Error if rate limit exceeded
   */
  private async checkRateLimit(ipAddress: string): Promise<void> {
    try {
      await this.rateLimiter.consume(ipAddress);
    } catch (error) {
      throw new Error(ErrorCodes.SECURITY_RATE_LIMIT_EXCEEDED.toString());
    }
  }
}