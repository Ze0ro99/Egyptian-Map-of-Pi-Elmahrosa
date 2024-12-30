import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import geoip from 'geoip-lite'; // v1.4.7
import { logger } from '../../shared/utils/logger.util';
import { ApiResponse } from '../../shared/interfaces/response.interface';

/**
 * Interface for tracking request performance metrics
 */
interface RequestMetrics {
  startTime: number;
  endTime?: number;
  processingTime?: number;
  bytesTransferred?: number;
  rateLimit?: {
    remaining: number;
    limit: number;
    resetTime: number;
  };
}

/**
 * Interface for enhanced security context
 */
interface SecurityContext {
  ipAddress: string;
  userAgent: string;
  geoLocation?: {
    country?: string;
    region?: string;
    city?: string;
    ll?: [number, number]; // latitude, longitude
  };
  rateLimitInfo?: {
    remaining: number;
    limit: number;
  };
  securityFlags: {
    isRateLimited: boolean;
    hasSecurityHeaders: boolean;
    isSuspiciousRequest: boolean;
  };
}

/**
 * Express middleware for comprehensive HTTP request/response logging
 * Implements detailed security auditing and performance monitoring
 */
export default function requestLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Generate unique request ID for correlation
  const requestId = uuidv4();
  
  // Initialize performance metrics
  const metrics: RequestMetrics = {
    startTime: Date.now(),
  };

  // Extract IP and get geolocation data
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  const geoData = geoip.lookup(ip.split(',')[0]);

  // Log initial request details
  const requestLog = formatRequestLog(req, requestId, geoData);
  logger.info('Incoming request', requestLog, requestId);

  // Store original res.json for interception
  const originalJson = res.json;
  
  // Override res.json to intercept response
  res.json = function(body: ApiResponse<any>): Response {
    metrics.endTime = Date.now();
    metrics.processingTime = metrics.endTime - metrics.startTime;
    
    // Calculate response size
    const responseSize = JSON.stringify(body).length;
    metrics.bytesTransferred = responseSize;

    // Get rate limit information
    metrics.rateLimit = {
      remaining: parseInt(res.getHeader('X-RateLimit-Remaining') as string) || 0,
      limit: parseInt(res.getHeader('X-RateLimit-Limit') as string) || 0,
      resetTime: parseInt(res.getHeader('X-RateLimit-Reset') as string) || 0
    };

    // Log response details
    const responseLog = formatResponseLog(
      res,
      body,
      requestId,
      metrics.processingTime,
      metrics
    );
    
    if (!body.success) {
      logger.error('Request failed', responseLog, requestId);
    } else {
      logger.info('Request completed', responseLog, requestId);
    }

    // Call original res.json with the body
    return originalJson.call(this, body);
  };

  next();
}

/**
 * Formats request details with enhanced security context
 */
function formatRequestLog(
  req: Request,
  requestId: string,
  geoData: geoip.Lookup | null
): Record<string, any> {
  // Build security context
  const securityContext: SecurityContext = {
    ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '',
    userAgent: req.headers['user-agent'] || '',
    geoLocation: geoData ? {
      country: geoData.country,
      region: geoData.region,
      city: geoData.city,
      ll: geoData.ll
    } : undefined,
    securityFlags: {
      isRateLimited: false,
      hasSecurityHeaders: Boolean(req.headers['x-content-security-policy']),
      isSuspiciousRequest: false
    }
  };

  // Check for rate limit headers
  if (req.headers['x-ratelimit-remaining']) {
    securityContext.rateLimitInfo = {
      remaining: parseInt(req.headers['x-ratelimit-remaining'] as string),
      limit: parseInt(req.headers['x-ratelimit-limit'] as string)
    };
    securityContext.securityFlags.isRateLimited = 
      securityContext.rateLimitInfo.remaining <= 0;
  }

  // Format request details
  return {
    requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    headers: {
      ...req.headers,
      // Mask sensitive headers
      authorization: req.headers.authorization ? '[REDACTED]' : undefined,
      cookie: req.headers.cookie ? '[REDACTED]' : undefined
    },
    body: req.method !== 'GET' ? maskSensitiveData(req.body) : undefined,
    query: req.query,
    params: req.params,
    security: securityContext,
    piNetwork: {
      piUserId: req.headers['x-pi-user-id'],
      piSessionId: req.headers['x-pi-session-id']
    }
  };
}

/**
 * Formats response details with performance metrics
 */
function formatResponseLog(
  res: Response,
  body: ApiResponse<any>,
  requestId: string,
  duration: number,
  metrics: RequestMetrics
): Record<string, any> {
  return {
    requestId,
    timestamp: new Date().toISOString(),
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    headers: res.getHeaders(),
    body: maskSensitiveData(body),
    success: body.success,
    error: body.error,
    metrics: {
      processingTime: duration,
      bytesTransferred: metrics.bytesTransferred,
      rateLimit: metrics.rateLimit
    },
    performance: {
      timeToFirstByte: metrics.startTime ? Date.now() - metrics.startTime : undefined,
      totalProcessingTime: duration,
      responseSize: metrics.bytesTransferred
    }
  };
}

/**
 * Masks sensitive data in objects before logging
 */
function maskSensitiveData(data: any): any {
  if (!data) return data;
  
  const sensitiveFields = [
    'password',
    'token',
    'apiKey',
    'secret',
    'phoneNumber',
    'email',
    'nationalId'
  ];

  const masked = { ...data };
  
  for (const field of sensitiveFields) {
    if (masked[field]) {
      masked[field] = '[REDACTED]';
    }
  }

  return masked;
}