/**
 * @fileoverview Main application entry point for the Payment Service microservice
 * Implements secure payment processing with Egyptian market adaptations
 * @version 1.0.0
 */

import { NestFactory } from '@nestjs/core'; // v10.0.0
import { ValidationPipe } from '@nestjs/common'; // v10.0.0
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'; // v7.1.0
import helmet from 'helmet'; // v7.0.0
import compression from 'compression'; // v1.7.4
import { logger } from '../../shared/utils/logger.util';
import moment from 'moment-timezone'; // v0.5.43

// Import root module and configurations
import { PaymentServiceModule } from './payment-service.module';
import { piPaymentConfig } from './config/pi-payment.config';

// Constants
const PORT = process.env.PAYMENT_SERVICE_PORT || 3003;
const API_VERSION = '1.0.0';
const EGYPTIAN_TIMEZONE = 'Africa/Cairo';
const EGYPTIAN_BUSINESS_HOURS = {
  start: '09:00',
  end: '22:00'
};
const EGYPTIAN_RATE_LIMITS = {
  window: '15m',
  max: 100
};

/**
 * Bootstrap the NestJS payment service application with Egyptian market configurations
 */
async function bootstrap(): Promise<void> {
  try {
    // Create NestJS application instance
    const app = await NestFactory.create(PaymentServiceModule, {
      logger: ['error', 'warn', 'log']
    });

    // Set global timezone for Egyptian market
    moment.tz.setDefault(EGYPTIAN_TIMEZONE);

    // Configure global validation pipe with Egyptian market rules
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      validationError: {
        target: false,
        value: false
      }
    }));

    // Configure security middleware
    app.use(helmet());
    app.use(compression());

    // Configure CORS for Pi Browser and Egyptian domains
    app.enableCors({
      origin: [
        'https://app.minepi.com',
        /\.egyptian-map-pi\.com$/,
        process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : false
      ].filter(Boolean),
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Pi-Network'],
      credentials: true,
      maxAge: 86400 // 24 hours
    });

    // Configure Swagger documentation with bilingual support
    const config = new DocumentBuilder()
      .setTitle('Egyptian Map of Pi - Payment Service')
      .setDescription(`
        Payment processing service for Egyptian Map of Pi marketplace
        خدمة معالجة المدفوعات لسوق خريطة باي المصري
      `)
      .setVersion(API_VERSION)
      .addTag('payments', 'Payment processing endpoints / نقاط نهاية معالجة الدفع')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    // Configure rate limiting for Egyptian market
    app.use((req, res, next) => {
      req.rateLimit = EGYPTIAN_RATE_LIMITS;
      next();
    });

    // Start the application
    await app.listen(PORT);

    logger.info('Payment Service started', {
      port: PORT,
      environment: process.env.NODE_ENV,
      timezone: EGYPTIAN_TIMEZONE,
      businessHours: EGYPTIAN_BUSINESS_HOURS
    });

    // Log startup in Arabic
    logger.info('تم بدء خدمة الدفع بنجاح', {
      port: PORT,
      environment: process.env.NODE_ENV,
      timezone: 'توقيت القاهرة',
      businessHours: {
        start: '٩:٠٠ صباحاً',
        end: '١٠:٠٠ مساءً'
      }
    });

  } catch (error) {
    logger.error('Failed to start Payment Service', error);
    process.exit(1);
  }
}

// Initialize application
bootstrap();

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection', reason);
  process.exit(1);
});

/**
 * Handle termination signals
 */
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});