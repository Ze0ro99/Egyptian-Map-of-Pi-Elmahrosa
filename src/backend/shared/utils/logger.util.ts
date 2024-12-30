import winston from 'winston'; // v3.10.0
import DailyRotateFile from 'winston-daily-rotate-file'; // v4.7.1

// Define log levels with numeric priorities
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Define colors for console output
const LOG_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

// Default configuration for log rotation
const LOG_CONFIG = {
  maxSize: '20m',
  maxFiles: '14d',
  datePattern: 'YYYY-MM-DD',
};

// PII patterns to filter from logs
const PII_PATTERNS = [
  /\b\d{16}\b/g, // Credit card numbers
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, // Email addresses
  /\b\d{11}\b/g, // Egyptian phone numbers
];

/**
 * Formats log messages with consistent structure and metadata enrichment
 */
const formatMessage = (message: string, metadata: Record<string, any> = {}): string => {
  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
  
  // Handle Arabic content with proper encoding
  const encodedMessage = message.normalize('NFKC');
  
  // Filter sensitive information
  let sanitizedMessage = encodedMessage;
  PII_PATTERNS.forEach(pattern => {
    sanitizedMessage = sanitizedMessage.replace(pattern, '[REDACTED]');
  });

  return JSON.stringify({
    timestamp,
    message: sanitizedMessage,
    service: 'egyptian-map-pi',
    environment: process.env.NODE_ENV || 'development',
    ...metadata,
  });
};

/**
 * LoggerService class providing structured logging with multiple severity levels
 */
export class LoggerService {
  private winstonLogger: winston.Logger;
  private requestContextStore: Map<string, Record<string, any>>;

  constructor(config: Record<string, any> = {}) {
    this.requestContextStore = new Map();

    // Configure Winston logger
    this.winstonLogger = winston.createLogger({
      levels: LOG_LEVELS,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: {
        service: 'egyptian-map-pi',
        environment: process.env.NODE_ENV || 'development',
      },
    });

    // Configure console transport
    if (process.env.NODE_ENV !== 'production') {
      this.winstonLogger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize({ colors: LOG_COLORS }),
          winston.format.simple()
        ),
      }));
    }

    // Configure file transport with rotation
    const fileTransport = new DailyRotateFile({
      filename: 'logs/egyptian-map-pi-%DATE%.log',
      ...LOG_CONFIG,
      zippedArchive: true,
      maxFiles: config.maxFiles || LOG_CONFIG.maxFiles,
      maxSize: config.maxSize || LOG_CONFIG.maxSize,
    });

    fileTransport.on('rotate', (oldFilename, newFilename) => {
      this.info('Log rotation performed', { oldFilename, newFilename });
    });

    this.winstonLogger.add(fileTransport);
  }

  /**
   * Sets request context for correlation
   */
  public setRequestContext(requestId: string, context: Record<string, any>): void {
    this.requestContextStore.set(requestId, {
      requestId,
      timestamp: new Date().toISOString(),
      ...context,
    });
  }

  /**
   * Clears request context
   */
  public clearRequestContext(requestId: string): void {
    this.requestContextStore.delete(requestId);
  }

  /**
   * Gets current request context
   */
  private getRequestContext(requestId?: string): Record<string, any> | undefined {
    return requestId ? this.requestContextStore.get(requestId) : undefined;
  }

  /**
   * Logs error level messages with stack traces
   */
  public error(message: string, error?: Error | Record<string, any>, requestId?: string): void {
    const metadata: Record<string, any> = {
      level: 'error',
      context: this.getRequestContext(requestId),
    };

    if (error instanceof Error) {
      metadata.stack = error.stack;
      metadata.name = error.name;
      metadata.message = error.message;
    } else if (error) {
      Object.assign(metadata, error);
    }

    this.winstonLogger.error(formatMessage(message, metadata));
  }

  /**
   * Logs warning level messages
   */
  public warn(message: string, metadata: Record<string, any> = {}, requestId?: string): void {
    const enrichedMetadata = {
      level: 'warn',
      context: this.getRequestContext(requestId),
      ...metadata,
    };

    this.winstonLogger.warn(formatMessage(message, enrichedMetadata));
  }

  /**
   * Logs info level messages
   */
  public info(message: string, metadata: Record<string, any> = {}, requestId?: string): void {
    const enrichedMetadata = {
      level: 'info',
      context: this.getRequestContext(requestId),
      ...metadata,
    };

    this.winstonLogger.info(formatMessage(message, enrichedMetadata));
  }

  /**
   * Logs debug level messages
   */
  public debug(message: string, metadata: Record<string, any> = {}, requestId?: string): void {
    const enrichedMetadata = {
      level: 'debug',
      context: this.getRequestContext(requestId),
      ...metadata,
    };

    this.winstonLogger.debug(formatMessage(message, enrichedMetadata));
  }
}

// Export singleton instance
export const logger = new LoggerService();