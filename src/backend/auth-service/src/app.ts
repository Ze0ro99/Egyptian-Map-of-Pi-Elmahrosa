/**
 * @fileoverview Enhanced application entry point for Egyptian Map of Pi authentication service
 * Implements secure authentication flows with Egyptian market adaptations, including
 * Arabic language support, cultural considerations, and regional compliance requirements.
 * 
 * @version 1.0.0
 */

import express, { Application, Request, Response, NextFunction } from 'express'; // ^4.18.0
import cors from 'cors'; // ^2.8.5
import helmet from 'helmet'; // ^7.0.0
import morgan from 'morgan'; // ^1.10.0
import i18next from 'i18next'; // ^23.0.0
import { Container } from 'inversify'; // ^6.0.1
import rateLimit from 'express-rate-limit'; // ^6.7.0
import compression from 'compression'; // ^1.7.4

import { AuthController } from './controllers/auth.controller';
import { jwtConfig } from './config/jwt.config';
import { ErrorCodes } from '../../shared/constants/error-codes';
import { ApiResponse } from '../../shared/interfaces/response.interface';

/**
 * Enhanced application class for Egyptian Map of Pi auth service with regional adaptations
 */
export class App {
  private readonly app: Application;
  private readonly container: Container;

  constructor() {
    this.app = express();
    this.container = new Container();
    this.initializeMiddleware();
    this.initializeLocalization();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Configures Express middleware with Egyptian market adaptations
   */
  private initializeMiddleware(): void {
    // Enhanced security headers
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://api.minepi.com"],
        },
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }));

    // CORS configuration with Egyptian domain rules
    this.app.use(cors({
      origin: [
        'https://egyptian-map-of-pi.app',
        'https://api.minepi.com',
        /\.egyptian-map-of-pi\.app$/
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-device-id', 'x-platform', 'x-app-version'],
      credentials: true,
      maxAge: 86400, // 24 hours
    }));

    // Request logging with Arabic support
    this.app.use(morgan('combined', {
      skip: (req) => req.url === '/health',
    }));

    // Body parsing with increased limit for file uploads
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression for response optimization
    this.app.use(compression());

    // Rate limiting for security
    this.app.use(rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: {
        success: false,
        error: {
          code: ErrorCodes.SECURITY_RATE_LIMIT_EXCEEDED,
          message: {
            ar: 'تم تجاوز الحد الأقصى للطلبات. يرجى المحاولة مرة أخرى لاحقاً',
            en: 'Rate limit exceeded. Please try again later.'
          }
        }
      }
    }));
  }

  /**
   * Initializes i18n support for Arabic and English
   */
  private initializeLocalization(): void {
    i18next.init({
      lng: 'ar', // Default language Arabic
      fallbackLng: 'en',
      supportedLngs: ['ar', 'en'],
      resources: {
        ar: require('../locales/ar.json'),
        en: require('../locales/en.json')
      }
    });
  }

  /**
   * Sets up authentication routes with Egyptian market features
   */
  private initializeRoutes(): void {
    const authController = this.container.resolve(AuthController);
    const router = express.Router();

    // Health check endpoint
    router.get('/health', (req: Request, res: Response) => {
      res.status(200).json({ status: 'healthy' });
    });

    // Authentication endpoints
    router.post('/auth/authenticate', authController.authenticate.bind(authController));
    router.post('/auth/refresh-token', authController.refreshToken.bind(authController));
    router.post('/auth/logout', authController.logout.bind(authController));
    router.post('/auth/verify-token', authController.verifyToken.bind(authController));

    this.app.use('/api/v1', router);
  }

  /**
   * Configures error handling with Arabic support
   */
  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use((req: Request, res: Response) => {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: {
          code: ErrorCodes.DATA_NOT_FOUND,
          message: {
            ar: 'المسار غير موجود',
            en: 'Path not found'
          },
          details: [],
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string
        },
        pagination: null
      };
      res.status(404).json(response);
    });

    // Global error handler
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      const errorCode = parseInt(err.message) || ErrorCodes.SYSTEM_INTERNAL_ERROR;
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: {
          code: errorCode,
          message: {
            ar: 'حدث خطأ في النظام',
            en: 'System error occurred'
          },
          details: process.env.NODE_ENV === 'development' ? [err.stack || ''] : [],
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string
        },
        pagination: null
      };
      res.status(500).json(response);
    });
  }

  /**
   * Starts the Express server with Egyptian market configurations
   */
  public async listen(port: number): Promise<void> {
    try {
      await new Promise<void>((resolve) => {
        this.app.listen(port, () => {
          console.log(`🚀 Auth service running on port ${port}`);
          console.log(`🔒 JWT issuer: ${jwtConfig.signOptions.issuer}`);
          resolve();
        });
      });
    } catch (error) {
      console.error('Failed to start auth service:', error);
      process.exit(1);
    }
  }
}