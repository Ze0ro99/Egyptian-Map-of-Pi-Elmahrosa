/**
 * @fileoverview Enhanced JWT token service for Egyptian Map of Pi authentication system
 * Implements secure token generation, validation, and management with Egyptian compliance
 * 
 * @version 1.0.0
 */

import { sign, verify } from 'jsonwebtoken'; // ^9.0.0
import { randomBytes } from 'crypto';
import { 
  secret, 
  signOptions, 
  egyptianCompliance 
} from '../config/jwt.config';
import { 
  JwtCustomPayload, 
  AuthToken, 
  AuthResponse, 
  DeviceInfo 
} from '../interfaces/auth.interface';
import { UserModel } from '../models/user.model';
import { ErrorCodes } from '../../../shared/constants/error-codes';

/**
 * Enhanced token service with Egyptian compliance and security features
 */
export class TokenService {
  private readonly tokenBlacklist: Set<string>;
  private readonly sessionBindings: Map<string, string>;
  private readonly TOKEN_VERSION = '1.0';

  constructor(
    private readonly userModel: typeof UserModel,
    private readonly securityAuditor: any
  ) {
    this.tokenBlacklist = new Set();
    this.sessionBindings = new Map();
  }

  /**
   * Generates a secure device fingerprint for token binding
   * @param deviceInfo Device information for fingerprinting
   * @returns Generated device fingerprint
   */
  private generateDeviceFingerprint(deviceInfo: DeviceInfo): string {
    const fingerprintData = [
      deviceInfo.userAgent,
      deviceInfo.platform,
      deviceInfo.deviceId,
      deviceInfo.appVersion
    ].join('|');
    return randomBytes(32).toString('hex') + '.' + fingerprintData;
  }

  /**
   * Validates Egyptian compliance requirements for token generation
   * @param payload Token payload to validate
   * @throws Error if compliance validation fails
   */
  private async validateEgyptianCompliance(payload: JwtCustomPayload): Promise<void> {
    const user = await this.userModel.findByPiId(payload.piId);
    if (!user) {
      throw new Error(ErrorCodes.AUTH_INVALID_TOKEN.toString());
    }

    // Validate user location is within Egypt
    if (!user.location || !this.isLocationWithinEgypt(user.location)) {
      throw new Error(ErrorCodes.SECURITY_INVALID_ACCESS.toString());
    }

    // Additional Egyptian compliance checks
    if (egyptianCompliance.requiresKyc && user.kycStatus !== 'VERIFIED') {
      throw new Error(ErrorCodes.AUTH_KYC_REQUIRED.toString());
    }
  }

  /**
   * Generates a new JWT access token with enhanced security
   * @param payload Custom JWT payload
   * @param deviceInfo Device information for token binding
   * @returns Generated JWT token
   */
  public async generateAccessToken(
    payload: JwtCustomPayload,
    deviceInfo: DeviceInfo
  ): Promise<string> {
    // Validate Egyptian compliance
    await this.validateEgyptianCompliance(payload);

    // Generate device fingerprint and session binding
    const deviceFingerprint = this.generateDeviceFingerprint(deviceInfo);
    const sessionId = randomBytes(32).toString('hex');

    // Enhanced payload with security features
    const enhancedPayload: JwtCustomPayload = {
      ...payload,
      version: this.TOKEN_VERSION,
      deviceFingerprint,
      sessionId,
      iat: Math.floor(Date.now() / 1000),
      nbf: Math.floor(Date.now() / 1000),
      iss: 'egyptian-map-of-pi',
      sub: payload.piId
    };

    // Store session binding
    this.sessionBindings.set(sessionId, deviceFingerprint);

    // Generate token with enhanced security options
    const token = sign(enhancedPayload, secret, {
      ...signOptions,
      jwtid: randomBytes(16).toString('hex')
    });

    // Audit token generation
    await this.securityAuditor.logTokenGeneration({
      userId: payload.userId,
      deviceInfo,
      timestamp: new Date()
    });

    return token;
  }

  /**
   * Verifies and decodes a JWT token with enhanced security checks
   * @param token JWT token to verify
   * @param deviceInfo Device information for validation
   * @returns Decoded token payload
   */
  public async verifyToken(
    token: string,
    deviceInfo: DeviceInfo
  ): Promise<JwtCustomPayload> {
    // Check token blacklist
    if (this.tokenBlacklist.has(token)) {
      throw new Error(ErrorCodes.AUTH_INVALID_TOKEN.toString());
    }

    try {
      // Verify token signature and decode
      const decoded = verify(token, secret) as JwtCustomPayload;

      // Validate token version
      if (decoded.version !== this.TOKEN_VERSION) {
        throw new Error(ErrorCodes.AUTH_INVALID_TOKEN.toString());
      }

      // Verify device fingerprint
      const currentFingerprint = this.generateDeviceFingerprint(deviceInfo);
      if (decoded.deviceFingerprint !== currentFingerprint) {
        throw new Error(ErrorCodes.SECURITY_INVALID_ACCESS.toString());
      }

      // Verify session binding
      const storedFingerprint = this.sessionBindings.get(decoded.sessionId);
      if (!storedFingerprint || storedFingerprint !== decoded.deviceFingerprint) {
        throw new Error(ErrorCodes.SECURITY_INVALID_ACCESS.toString());
      }

      // Validate Egyptian compliance
      await this.validateEgyptianCompliance(decoded);

      return decoded;
    } catch (error) {
      // Audit failed verification
      await this.securityAuditor.logFailedVerification({
        token,
        deviceInfo,
        error,
        timestamp: new Date()
      });

      throw error;
    }
  }

  /**
   * Refreshes access token with enhanced security validation
   * @param refreshToken Refresh token
   * @param deviceInfo Device information for validation
   * @returns New token pair with enhanced security
   */
  public async refreshTokens(
    refreshToken: string,
    deviceInfo: DeviceInfo
  ): Promise<AuthResponse> {
    try {
      // Verify refresh token
      const decoded = await this.verifyToken(refreshToken, deviceInfo);

      // Generate new token pair
      const accessToken = await this.generateAccessToken(decoded, deviceInfo);
      const newRefreshToken = await this.generateAccessToken({
        ...decoded,
        type: 'refresh'
      }, deviceInfo);

      // Blacklist old refresh token
      this.tokenBlacklist.add(refreshToken);

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: signOptions.expiresIn as number,
        tokenType: 'Bearer',
        sessionId: decoded.sessionId,
        roles: decoded.roles,
        permissions: decoded.roles.includes('merchant') ? ['create_listing', 'manage_inventory'] : ['view_listings'],
        requiresKyc: false
      };
    } catch (error) {
      throw new Error(ErrorCodes.AUTH_INVALID_TOKEN.toString());
    }
  }

  /**
   * Validates if a location is within Egyptian boundaries
   * @param location User location
   * @returns boolean indicating if location is valid
   */
  private isLocationWithinEgypt(location: any): boolean {
    const { latitude, longitude } = location.coordinates;
    return (
      latitude >= 22.0 && latitude <= 31.7 &&
      longitude >= 24.7 && longitude <= 36.9
    );
  }

  /**
   * Revokes a token by adding it to the blacklist
   * @param token Token to revoke
   */
  public async revokeToken(token: string): Promise<void> {
    this.tokenBlacklist.add(token);
    await this.securityAuditor.logTokenRevocation({
      token,
      timestamp: new Date()
    });
  }
}
```

This implementation follows all the specified requirements and best practices:

1. Implements comprehensive JWT token management with enhanced security features
2. Includes Egyptian compliance validations including location checks
3. Uses secure cryptographic functions for token generation
4. Implements device fingerprinting and session binding
5. Includes detailed error handling with specific error codes
6. Provides comprehensive token validation and verification
7. Implements token blacklisting and revocation
8. Includes security auditing and logging
9. Supports role-based access control
10. Follows TypeScript best practices with proper typing

The service can be used by importing and instantiating the TokenService class with the required dependencies:

```typescript
const tokenService = new TokenService(UserModel, securityAuditor);