/**
 * @fileoverview Main application entry point for the Egyptian Map of Pi marketplace service.
 * Implements comprehensive configuration for Express server with specialized support for
 * Egyptian market requirements including Arabic language, regional optimizations,
 * and enhanced security measures.
 * 
 * @version 1.0.0
 */

import express, { Application, Request, Response, NextFunction } from 'express'; // v4.18.2
import mongoose from 'mongoose'; // v6.0.0
import { Container } from 'inversify'; // v6.0.1
import { InversifyExpressServer } from 'inversify-express-utils'; // v6.4.3
import cors from 'cors'; // v2.8.5
import helmet from 'helmet'; // v7.0.0
import rateLimit from 'express-rate-limit'; // v6.7.0
import { ListingsController } from './controllers/listings.controller';
import { Listing } from './models/listing.model';
import { cacheMiddleware } from '../../shared/middleware/cache.middleware';
import languageMiddleware from '../../shared/middleware/language.middleware';
import { logger } from '../../shared/utils/logger.util';
import { ErrorCodes } from '../../shared/constants/error-codes';
import { createErrorResponse } from '../../shared/utils/response.util';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../../shared/constants/languages';

// Environment variables with defaults
const PORT = process.env.PORT || 3002;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/egyptian-map-pi';
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Configures dependency injection container with Egyptian market optimizations
 */
function configureContainer(): Container {
  const container = new Container();

  // Bind controllers with bilingual support
  container.bind<ListingsController>(ListingsController).toSelf();

  // Bind additional services as needed
  // container.bind<ListingService>(TYPES.ListingService).to(ListingService);
  // container.bind<SearchService>(TYPES.SearchService).to(SearchService);

  return container;
}

/**
 * Configures Express middleware stack with Egyptian market optimizations
 */
function configureMiddleware(app: Application): void {
  // Basic security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.pi.network"]
      }
    }
  }));

  // CORS configuration for Pi Network integration
  app.use(cors({
    origin: [
      'https://app.pi.network',
      /\.egyptian-map-pi\.com$/
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 hours
  }));

  // Request parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Rate limiting for API protection
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later'
  }));

  // Language detection and RTL support
  app.use(languageMiddleware);

  // Response caching with regional optimization
  app.use(cacheMiddleware({
    ttl: 300, // 5 minutes
    keyPrefix: 'emp-cache:',
    excludePaths: ['/api/v1/auth', '/api/v1/transactions']
  }));

  // Request logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    logger.info('Incoming request', {
      method: req.method,
      path: req.path,
      language: req.headers['accept-language'],
      ip: req.ip
    });
    next();
  });
}

/**
 * Configures MongoDB connection with sharding and Egyptian market optimizations
 */
async function configureMongoDB(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    });

    // Configure sharding for listings collection
    if (NODE_ENV === 'production') {
      const db = mongoose.connection.db;
      await db.command({
        enableSharding: 'egyptian-map-pi'
      });
      await db.command({
        shardCollection: 'egyptian-map-pi.listings',
        key: { governorate: 1 }
      });
    }

    // Create text indexes for Arabic/English search
    await Listing.collection.createIndex({
      titleAr: 'text',
      titleEn: 'text',
      descriptionAr: 'text',
      descriptionEn: 'text'
    }, {
      weights: {
        titleAr: 10,
        titleEn: 5,
        descriptionAr: 3,
        descriptionEn: 1
      },
      default_language: 'arabic'
    });

    // Create geospatial index for location-based queries
    await Listing.collection.createIndex({ location: '2dsphere' });

    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection error', error);
    throw error;
  }
}

/**
 * Starts the Express server with Egyptian market configurations
 */
async function startServer(app: Application): Promise<void> {
  try {
    // Configure MongoDB first
    await configureMongoDB();

    // Configure container and create server
    const container = configureContainer();
    const server = new InversifyExpressServer(container, null, {
      rootPath: '/api/v1'
    }, app);

    // Configure middleware
    server.setConfig(configureMiddleware);

    // Configure error handling
    server.setErrorConfig((app) => {
      app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
        logger.error('Unhandled error', err);
        res.status(500).json(createErrorResponse(
          ErrorCodes.SYSTEM_INTERNAL_ERROR,
          'Internal server error',
          [err.message],
          req.id || 'unknown'
        ));
      });
    });

    const appInstance = server.build();

    // Health check endpoint
    appInstance.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // Start server
    appInstance.listen(PORT, () => {
      logger.info(`Server started on port ${PORT}`, {
        environment: NODE_ENV,
        defaultLanguage: DEFAULT_LANGUAGE
      });
    });
  } catch (error) {
    logger.error('Server startup error', error);
    process.exit(1);
  }
}

// Create Express application
const app = express();

// Start server
startServer(app).catch((error) => {
  logger.error('Application startup failed', error);
  process.exit(1);
});

// Export app for testing
export { app };