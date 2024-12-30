/**
 * @fileoverview Main application file for the Egyptian Map of Pi location service.
 * Implements geospatial operations with Egyptian-specific features including
 * military zone awareness, bilingual support, and regional optimizations.
 * 
 * @version 1.0.0
 */

import express, { Application, Request, Response, NextFunction } from 'express'; // ^4.18.0
import cors from 'cors'; // ^2.8.5
import helmet from 'helmet'; // ^7.0.0
import morgan from 'morgan'; // ^1.10.0
import mongoose from 'mongoose'; // ^7.0.0
import { createClient } from 'redis'; // ^4.6.7
import i18next from 'i18next'; // ^23.2.0
import LocationController from './controllers/location.controller';
import { mapsConfig } from './config/maps.config';

/**
 * Main application class for the Egyptian Map of Pi location service
 */
class LocationServiceApp {
  private readonly app: Application;
  private readonly locationController: LocationController;
  private readonly port: number;
  private readonly mongoUri: string;
  private readonly redisClient: ReturnType<typeof createClient>;

  constructor() {
    this.app = express();
    this.locationController = new LocationController();
    this.port = Number(process.env.PORT) || 3002;
    this.mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/egyptian-map-pi';
    this.redisClient = createClient({
      url: process.env.REDIS_URI,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
      }
    });

    this.initializeI18n();
    this.configureMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Initializes i18next for bilingual support (Arabic/English)
   */
  private async initializeI18n(): Promise<void> {
    await i18next.init({
      lng: 'ar', // Default to Arabic
      fallbackLng: 'en',
      supportedLngs: ['ar', 'en'],
      resources: {
        ar: {
          translation: {
            serverStarted: 'تم تشغيل خدمة الموقع على المنفذ {{port}}',
            dbConnected: 'تم الاتصال بقاعدة البيانات بنجاح',
            cacheConnected: 'تم الاتصال بخدمة التخزين المؤقت',
            invalidLocation: 'موقع غير صالح أو في منطقة محظورة'
          }
        },
        en: {
          translation: {
            serverStarted: 'Location service started on port {{port}}',
            dbConnected: 'Database connected successfully',
            cacheConnected: 'Cache service connected',
            invalidLocation: 'Invalid location or restricted zone'
          }
        }
      }
    });
  }

  /**
   * Configures Express middleware stack with Egyptian-specific requirements
   */
  private configureMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS configuration with Egyptian domains whitelist
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://egyptian-map-pi.app'],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    }));

    // Request logging with bilingual support
    this.app.use(morgan(':method :url :status :response-time ms - :res[content-length]'));
    
    // Body parsing with Arabic character support
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Language detection middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const lang = req.headers['accept-language']?.includes('ar') ? 'ar' : 'en';
      req.language = lang;
      next();
    });
  }

  /**
   * Sets up application routes with Egyptian-specific handlers
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'healthy',
        message: i18next.t('serverStarted', { lng: req.language, port: this.port })
      });
    });

    // Location service routes
    this.app.post('/api/v1/locations', this.locationController.createLocation);
    this.app.get('/api/v1/locations/nearby', this.locationController.findNearbyLocations);
    this.app.post('/api/v1/locations/validate', this.locationController.validateLocation);

    // Military zone validation endpoint
    this.app.post('/api/v1/locations/military-zone', async (req: Request, res: Response) => {
      const { coordinates } = req.body;
      const isRestricted = mapsConfig.restrictedZones.some(zone => 
        coordinates.latitude >= zone.latitude - 0.1 &&
        coordinates.latitude <= zone.latitude + 0.1 &&
        coordinates.longitude >= zone.longitude - 0.1 &&
        coordinates.longitude <= zone.longitude + 0.1
      );

      res.json({
        isRestricted,
        message: isRestricted ? i18next.t('invalidLocation', { lng: req.language }) : null
      });
    });
  }

  /**
   * Configures error handling with bilingual support
   */
  private setupErrorHandling(): void {
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error(err.stack);
      res.status(500).json({
        success: false,
        message: {
          ar: 'حدث خطأ في الخادم',
          en: 'Internal server error'
        },
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    });
  }

  /**
   * Initializes database connection with PostGIS support
   */
  private async initializeDatabase(): Promise<void> {
    try {
      await mongoose.connect(this.mongoUri, {
        autoIndex: true,
        maxPoolSize: 10,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 5000
      });

      console.log(i18next.t('dbConnected'));
    } catch (error) {
      console.error('Database connection error:', error);
      process.exit(1);
    }
  }

  /**
   * Initializes Redis cache connection
   */
  private async initializeCache(): Promise<void> {
    try {
      await this.redisClient.connect();
      console.log(i18next.t('cacheConnected'));
    } catch (error) {
      console.error('Cache connection error:', error);
      // Continue without cache
    }
  }

  /**
   * Starts the application server
   */
  public async initialize(): Promise<void> {
    await this.initializeDatabase();
    await this.initializeCache();

    this.app.listen(this.port, () => {
      console.log(i18next.t('serverStarted', { port: this.port }));
    });
  }
}

// Create and export application instance
const locationServiceApp = new LocationServiceApp();
export default locationServiceApp;