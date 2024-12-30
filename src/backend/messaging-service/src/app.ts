/**
 * @fileoverview Main application entry point for Egyptian Map of Pi messaging service
 * Implements real-time messaging with Arabic language support and network resilience
 * Version: 1.0.0
 */

import express from 'express'; // v4.18.0
import { Container } from 'inversify'; // v6.0.0
import { Server } from 'socket.io'; // v4.7.0
import { createServer } from 'http'; // native
import cors from 'cors'; // v2.8.5
import helmet from 'helmet'; // v7.0.0
import i18n from 'i18next'; // v23.2.0
import { socketConfig } from './config/socket.config';
import { SocketService } from './services/socket.service';
import { MessagesController } from './controllers/messages.controller';
import { RateLimiter } from 'rate-limiter-flexible';
import { RedisAdapter } from '@socket.io/redis-adapter';
import { PiAuthService } from '@pi-network/auth';

/**
 * Configures Express middleware with enhanced security and Arabic language support
 * @param app - Express application instance
 */
const setupMiddleware = (app: express.Application): void => {
  // Enhanced CORS configuration for Egyptian domains
  app.use(cors({
    origin: socketConfig.cors.origin,
    methods: ['GET', 'POST', 'PATCH'],
    credentials: true,
    maxAge: 86400 // 24 hours
  }));

  // Security headers with Pi Network specifics
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", "*.pi.network", "*.mapofpi.com"],
        imgSrc: ["'self'", "data:", "*.pi.network", "*.mapofpi.com"],
        scriptSrc: ["'self'", "*.pi.network"]
      }
    }
  }));

  // Body parser with Arabic character support
  app.use(express.json({
    limit: '5mb',
    verify: (req, res, buf) => {
      try {
        JSON.parse(buf.toString());
      } catch (e) {
        throw new Error('Invalid JSON with special characters');
      }
    }
  }));

  // URL-encoded parser with extended character sets
  app.use(express.urlencoded({ 
    extended: true,
    limit: '5mb'
  }));

  // Initialize i18n middleware for Arabic language
  i18n.init({
    lng: 'ar', // Default to Arabic
    fallbackLng: 'en',
    supportedLngs: ['ar', 'en'],
    backend: {
      loadPath: './locales/{{lng}}/{{ns}}.json'
    },
    detection: {
      order: ['header', 'querystring', 'cookie'],
      lookupHeader: 'accept-language'
    }
  });
  app.use(i18n.handle);
};

/**
 * Configures dependency injection container with enhanced services
 * @returns Configured Container instance
 */
const setupContainer = (): Container => {
  const container = new Container();

  // Configure rate limiter with Egyptian usage patterns
  const rateLimiter = new RateLimiter({
    points: 60, // Number of points
    duration: 60, // Per 60 seconds
    blockDuration: 60 * 2 // Block for 2 minutes if exceeded
  });

  // Redis adapter for Socket.IO scaling
  const redisAdapter = new RedisAdapter({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    retryStrategy: (times) => Math.min(times * 100, 3000)
  });

  // Pi Network authentication service
  const piAuthService = new PiAuthService({
    apiKey: process.env.PI_API_KEY!,
    environment: process.env.NODE_ENV === 'production' ? 'mainnet' : 'testnet'
  });

  // Bind services to container
  container.bind<SocketService>('SocketService')
    .to(SocketService)
    .inSingletonScope();
  container.bind<MessagesController>('MessagesController')
    .to(MessagesController)
    .inSingletonScope();
  container.bind<RateLimiter>('RateLimiter')
    .toConstantValue(rateLimiter);
  container.bind<RedisAdapter>('RedisAdapter')
    .toConstantValue(redisAdapter);
  container.bind<PiAuthService>('PiAuthService')
    .toConstantValue(piAuthService);

  return container;
};

/**
 * Initializes and starts the messaging service
 */
const startServer = async (): Promise<void> => {
  try {
    // Create Express application
    const app = express();
    setupMiddleware(app);

    // Configure dependency injection
    const container = setupContainer();

    // Create HTTP server with timeout configurations
    const httpServer = createServer(app);
    httpServer.timeout = 30000; // 30 seconds
    httpServer.keepAliveTimeout = 65000; // 65 seconds

    // Initialize Socket.IO with Egyptian network optimizations
    const socketService = container.get<SocketService>('SocketService');
    socketService.initialize(httpServer);

    // Start server
    const port = process.env.PORT || 3000;
    httpServer.listen(port, () => {
      console.log(`🚀 Messaging service running on port ${port}`);
      console.log(`🌐 Socket.IO server configured with Egyptian optimizations`);
      console.log(`🔒 Security measures and rate limiting enabled`);
      console.log(`🗣️ Arabic language support initialized`);
    });

    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      console.log('Received SIGTERM signal. Initiating graceful shutdown...');
      httpServer.close(() => {
        console.log('Server closed. Exiting process.');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start messaging service:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Export app for testing purposes
export { startServer };