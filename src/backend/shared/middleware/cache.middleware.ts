import Redis from 'ioredis'; // v5.3.2
import { Request, Response, NextFunction } from 'express'; // v4.18.2
import compression from 'compression'; // v1.7.4
import { createHash } from 'crypto';
import { logger } from '../utils/logger.util';
import { ApiResponse } from '../interfaces/response.interface';

/**
 * Configuration options for the cache middleware
 */
interface CacheOptions {
  ttl: number; // Time-to-live in seconds
  keyPrefix: string; // Prefix for cache keys
  enabled: boolean; // Enable/disable caching
  excludePaths: string[]; // Paths to exclude from caching
  maxSize: number; // Maximum cache size in bytes
  compressionThreshold: number; // Size threshold for compression in bytes
  retryAttempts: number; // Number of retry attempts for Redis operations
  enableMetrics: boolean; // Enable cache metrics collection
}

/**
 * Default cache configuration
 */
const DEFAULT_OPTIONS: CacheOptions = {
  ttl: 300, // 5 minutes default TTL
  keyPrefix: 'emp-cache:', // Egyptian Map of Pi cache prefix
  enabled: true,
  excludePaths: ['/api/v1/auth', '/api/v1/transactions'],
  maxSize: 100 * 1024 * 1024, // 100MB max cache size
  compressionThreshold: 1024, // 1KB compression threshold
  retryAttempts: 3,
  enableMetrics: true
};

/**
 * Circuit breaker for handling Redis failures
 */
class CircuitBreaker {
  private failures: number = 0;
  private lastFailure: number = 0;
  private readonly threshold: number = 5;
  private readonly resetTimeout: number = 30000; // 30 seconds

  public isOpen(): boolean {
    if (this.failures >= this.threshold) {
      const timeSinceLastFailure = Date.now() - this.lastFailure;
      if (timeSinceLastFailure >= this.resetTimeout) {
        this.reset();
        return false;
      }
      return true;
    }
    return false;
  }

  public recordFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();
  }

  public reset(): void {
    this.failures = 0;
    this.lastFailure = 0;
  }
}

/**
 * Service class for handling Redis cache operations
 */
class CacheService {
  private readonly redisClient: Redis;
  private readonly options: CacheOptions;
  private readonly breaker: CircuitBreaker;
  private cacheSize: number = 0;

  constructor(options: CacheOptions) {
    this.options = options;
    this.breaker = new CircuitBreaker();

    // Initialize Redis client with cluster support
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times: number) => {
        if (times <= this.options.retryAttempts) {
          return Math.min(times * 100, 3000);
        }
        return null;
      },
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    });

    // Monitor Redis connection
    this.redisClient.on('error', (error) => {
      logger.error('Redis connection error', error);
      this.breaker.recordFailure();
    });

    this.redisClient.on('ready', () => {
      logger.info('Redis connection established');
      this.breaker.reset();
    });

    // Initialize cache size monitoring
    if (options.enableMetrics) {
      this.monitorCacheSize();
    }
  }

  /**
   * Retrieves cached value with decompression support
   */
  public async get(key: string): Promise<ApiResponse<any> | null> {
    if (this.breaker.isOpen()) {
      logger.warn('Cache circuit breaker is open, skipping cache read');
      return null;
    }

    try {
      const cached = await this.redisClient.get(key);
      if (!cached) return null;

      const decompressed = await this.decompress(cached);
      return JSON.parse(decompressed);
    } catch (error) {
      logger.error('Cache retrieval error', error);
      this.breaker.recordFailure();
      return null;
    }
  }

  /**
   * Stores value with compression support
   */
  public async set(key: string, value: ApiResponse<any>): Promise<void> {
    if (this.breaker.isOpen()) {
      logger.warn('Cache circuit breaker is open, skipping cache write');
      return;
    }

    try {
      const valueWithMetadata = {
        ...value,
        _cached: new Date().toISOString(),
        _version: '1.0'
      };

      const serialized = JSON.stringify(valueWithMetadata);
      const compressed = await this.compress(serialized);

      await this.redisClient.setex(key, this.options.ttl, compressed);
      
      if (this.options.enableMetrics) {
        this.updateCacheSize(key, compressed.length);
      }
    } catch (error) {
      logger.error('Cache storage error', error);
      this.breaker.recordFailure();
    }
  }

  /**
   * Invalidates cache entries by pattern
   */
  public async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await this.redisClient.keys(`${this.options.keyPrefix}${pattern}`);
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
        logger.debug(`Invalidated ${keys.length} cache entries`);
      }
    } catch (error) {
      logger.error('Cache invalidation error', error);
    }
  }

  /**
   * Compresses data if it exceeds threshold
   */
  private async compress(data: string): Promise<string> {
    if (data.length < this.options.compressionThreshold) {
      return data;
    }

    const compressed = await new Promise<Buffer>((resolve, reject) => {
      compression()(
        { data } as Request,
        { write: (chunk: Buffer) => resolve(chunk) } as Response,
        (error) => error && reject(error)
      );
    });

    return compressed.toString('base64');
  }

  /**
   * Decompresses data if compressed
   */
  private async decompress(data: string): Promise<string> {
    try {
      const buffer = Buffer.from(data, 'base64');
      return buffer.toString();
    } catch {
      return data; // Return as-is if not compressed
    }
  }

  /**
   * Monitors and manages cache size
   */
  private async monitorCacheSize(): Promise<void> {
    setInterval(async () => {
      try {
        const info = await this.redisClient.info('memory');
        const usedMemory = parseInt(info.match(/used_memory:(\d+)/)?.[1] || '0');
        
        if (usedMemory > this.options.maxSize) {
          logger.warn('Cache size exceeded limit, initiating eviction');
          await this.evictOldest();
        }

        this.cacheSize = usedMemory;
      } catch (error) {
        logger.error('Cache monitoring error', error);
      }
    }, 60000); // Check every minute
  }

  /**
   * Evicts oldest cache entries when size limit is exceeded
   */
  private async evictOldest(): Promise<void> {
    try {
      const keys = await this.redisClient.keys(`${this.options.keyPrefix}*`);
      const keyAges = await Promise.all(
        keys.map(async (key) => ({
          key,
          ttl: await this.redisClient.ttl(key)
        }))
      );

      // Sort by TTL and remove oldest 10%
      const toEvict = keyAges
        .sort((a, b) => a.ttl - b.ttl)
        .slice(0, Math.max(1, Math.floor(keys.length * 0.1)))
        .map(({ key }) => key);

      if (toEvict.length > 0) {
        await this.redisClient.del(...toEvict);
        logger.info(`Evicted ${toEvict.length} cache entries`);
      }
    } catch (error) {
      logger.error('Cache eviction error', error);
    }
  }

  /**
   * Updates cache size metrics
   */
  private async updateCacheSize(key: string, size: number): Promise<void> {
    this.cacheSize += size;
    if (this.cacheSize > this.options.maxSize) {
      await this.evictOldest();
    }
  }
}

/**
 * Generates a unique cache key for the request
 */
function generateCacheKey(req: Request, prefix: string): string {
  const components = [
    req.method,
    req.path,
    JSON.stringify(Object.keys(req.query).sort().reduce((acc, key) => {
      acc[key] = req.query[key];
      return acc;
    }, {} as Record<string, any>))
  ];

  if (['POST', 'PUT'].includes(req.method)) {
    const bodyHash = createHash('md5').update(JSON.stringify(req.body)).digest('hex');
    components.push(bodyHash);
  }

  const key = components.join(':');
  const hash = createHash('md5').update(key).digest('hex');
  return `${prefix}${hash}`;
}

/**
 * Express middleware for caching API responses
 */
export function cacheMiddleware(options: Partial<CacheOptions> = {}) {
  const mergedOptions: CacheOptions = { ...DEFAULT_OPTIONS, ...options };
  const cacheService = new CacheService(mergedOptions);

  return async (req: Request, res: Response, next: NextFunction) => {
    if (!mergedOptions.enabled || 
        req.method !== 'GET' || 
        mergedOptions.excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const cacheKey = generateCacheKey(req, mergedOptions.keyPrefix);

    try {
      const cachedResponse = await cacheService.get(cacheKey);
      if (cachedResponse) {
        logger.debug('Cache hit', { path: req.path, key: cacheKey });
        return res.json(cachedResponse);
      }

      // Store original send function
      const originalSend = res.json;
      res.json = function(body: any) {
        const response = body as ApiResponse<any>;
        if (response.success) {
          cacheService.set(cacheKey, response).catch((error) => {
            logger.error('Failed to cache response', error);
          });
        }
        return originalSend.call(this, body);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', error);
      next();
    }
  };
}

export { CacheService, CacheOptions };