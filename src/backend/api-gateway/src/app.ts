/**
 * @fileoverview Main application entry point for the Egyptian Map of Pi API Gateway service.
 * Implements a robust, secure, and compliant API Gateway with Egyptian market-specific features.
 * 
 * @version 1.0.0
 */

import express, { Application } from 'express'; // ^4.18.2
import cors from 'cors'; // ^2.8.5
import helmet from 'helmet'; // ^7.0.0
import compression from 'compression'; // ^1.7.4
import morgan from 'morgan'; // ^1.10.0
import i18next from 'i18next'; // ^23.5.0

import corsConfig from './config/cors.config';
import { rateLimitConfig, createRateLimiter } from './config/rate-limit.config';
import { configureRoutes } from './config/routes.config';
import errorMiddleware from './middleware/error.middleware';
import { logger } from '../../shared/utils/logger.util';

/**
 * Initializes and configures the Express application with Egyptian market-specific features
 * and comprehensive security controls.
 * 
 * @returns {Application} Configured Express application instance
 */
function initializeApp(): Application {
  const app: Application = express();

  // Basic security headers with Egyptian compliance
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://app-cdn.minepi.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.minepi.com", "wss://egyptian-map-of-pi.com"]
      }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
  }));

  // Enhanced CORS with Egyptian domain validations
  app.use(cors({
    origin: corsConfig.allowedOrigins,
    methods: corsConfig.allowedMethods,
    allowedHeaders: corsConfig.allowedHeaders,
    credentials: corsConfig.credentials,
    maxAge: 86400 // 24 hours
  }));

  // Initialize i18next for Arabic/English support
  i18next.init({
    lng: 'ar', // Default to Arabic
    fallbackLng: 'en',
    supportedLngs: ['ar', 'en'],
    backend: {
      loadPath: './locales/{{lng}}/{{ns}}.json'
    }
  });

  // Request parsing with Arabic character support
  app.use(express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      try {
        JSON.parse(buf.toString());
      } catch (e) {
        throw new Error('Invalid JSON payload');
      }
    }
  }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Compression with market-specific optimizations
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    threshold: 1024 // Compress responses larger than 1KB
  }));

  // Enhanced request logging
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => {
        logger.info('HTTP Request', {
          log: message.trim(),
          service: 'api-gateway'
        });
      }
    },
    skip: (req) => req.url === '/health'
  }));

  // Regional rate limiting
  app.use('/api/v1/listings', createRateLimiter('publicListings'));
  app.use('/api/v1/users', createRateLimiter('userOperations'));
  app.use('/api/v1/transactions', createRateLimiter('transactions'));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      region: process.env.EGYPTIAN_REGION || 'me-south-1'
    });
  });

  // Configure API routes with Egyptian compliance
  configureRoutes(app);

  // Global error handling with bilingual support
  app.use(errorMiddleware);

  return app;
}

/**
 * Starts the API Gateway server with Egyptian market optimizations
 * 
 * @param {Application} app - Configured Express application
 * @returns {Promise<void>}
 */
async function startServer(app: Application): Promise<void> {
  try {
    const port = process.env.PORT || 3000;
    const server = app.listen(port, () => {
      logger.info('API Gateway started', {
        port,
        environment: process.env.NODE_ENV,
        region: process.env.EGYPTIAN_REGION,
        message: {
          en: `Server is running on port ${port}`,
          ar: `الخادم يعمل على المنفذ ${port}`
        }
      });
    });

    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
}

// Initialize and export application instance
const app = initializeApp();

// Start server if running directly
if (require.main === module) {
  startServer(app).catch((error) => {
    logger.error('Server startup failed', error as Error);
    process.exit(1);
  });
}

export default app;