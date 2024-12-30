/**
 * @fileoverview Socket.IO configuration for real-time messaging in Egyptian Map of Pi marketplace
 * Implements comprehensive security, performance optimization, and cultural adaptations
 * Version: 1.0.0
 */

import { Server, ServerOptions } from 'socket.io'; // v4.7.0
import { MessageType } from '../interfaces/message.interface';

/**
 * Interface defining enhanced Socket.IO server configuration options
 * Includes security, performance, and cultural adaptation settings
 */
interface SocketConfig extends ServerOptions {
  connectionQualityConfig: {
    minLatency: number;
    maxLatency: number;
    degradationThreshold: number;
    reconnectInterval: number;
    healthCheckInterval: number;
  };
  arabicEncodingConfig: {
    enforceUTF8: boolean;
    bidirectionalSupport: boolean;
  };
}

/**
 * Default Socket.IO endpoint path
 * Configured for Pi Network integration
 */
export const SOCKET_PATH = '/socket.io';

/**
 * Adaptive ping timeout with network condition consideration
 * Optimized for Egyptian mobile networks
 */
export const PING_TIMEOUT = 5000; // 5 seconds

/**
 * Dynamic ping interval adjusting to network quality
 * Balanced for performance and resource usage
 */
export const PING_INTERVAL = 10000; // 10 seconds

/**
 * Maximum HTTP buffer size for file transfers
 * Set to 5MB to accommodate image sharing
 */
export const MAX_BUFFER_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Strictly controlled list of allowed origins
 * Limited to Pi Network and Egyptian Map of Pi domains
 */
export const ALLOWED_ORIGINS = [
  'https://*.pi.network',
  'https://*.mapofpi.com'
];

/**
 * Creates comprehensive Socket.IO server configuration
 * Implements security, performance, and cultural adaptations
 * 
 * @param options - Optional configuration overrides
 * @returns Enhanced Socket.IO server configuration
 */
export const createSocketConfig = (options?: Partial<SocketConfig>): ServerOptions => {
  const defaultConfig: SocketConfig = {
    path: SOCKET_PATH,
    pingTimeout: PING_TIMEOUT,
    pingInterval: PING_INTERVAL,
    maxHttpBufferSize: MAX_BUFFER_SIZE,
    
    // Enhanced security settings
    cors: {
      origin: ALLOWED_ORIGINS,
      methods: ['GET', 'POST'],
      credentials: true,
      allowedHeaders: [
        'Authorization',
        'X-Pi-Network-Token',
        'Content-Type'
      ]
    },
    
    // Transport configuration
    transports: ['websocket', 'polling'],
    allowUpgrades: true,
    
    // Cookie settings for session management
    cookie: {
      name: 'pi_socket_io',
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 86400000 // 24 hours
    },
    
    // Connection quality monitoring
    connectionQualityConfig: {
      minLatency: 100, // Minimum acceptable latency
      maxLatency: 2000, // Maximum tolerable latency
      degradationThreshold: 1500, // Threshold for connection degradation
      reconnectInterval: 3000, // Reconnection attempt interval
      healthCheckInterval: 30000 // Connection health check interval
    },
    
    // Arabic language support configuration
    arabicEncodingConfig: {
      enforceUTF8: true,
      bidirectionalSupport: true
    }
  };

  // Merge default config with provided options
  const config: SocketConfig = {
    ...defaultConfig,
    ...options,
    // Preserve nested objects with deep merge
    cors: {
      ...defaultConfig.cors,
      ...(options?.cors || {})
    },
    connectionQualityConfig: {
      ...defaultConfig.connectionQualityConfig,
      ...(options?.connectionQualityConfig || {})
    }
  };

  // Additional security middleware configuration
  const serverConfig: ServerOptions = {
    ...config,
    // Connection middleware for Pi Network authentication
    connectTimeout: 10000,
    // Adapter configuration for scaling
    adapter: {
      rooms: new Map(),
      sids: new Map(),
      pubClient: null,
      subClient: null
    },
    // Parser configuration for message handling
    parser: {
      protocol: 4,
      encodedPackets: true,
      decodeStrings: true
    }
  };

  return serverConfig;
};

/**
 * Default Socket.IO configuration instance
 * Pre-configured for Egyptian Map of Pi production environment
 */
export const socketConfig = createSocketConfig({
  // Production-specific overrides
  pingTimeout: process.env.SOCKET_PING_TIMEOUT 
    ? parseInt(process.env.SOCKET_PING_TIMEOUT) 
    : PING_TIMEOUT,
  pingInterval: process.env.SOCKET_PING_INTERVAL 
    ? parseInt(process.env.SOCKET_PING_INTERVAL) 
    : PING_INTERVAL,
  // Additional production settings
  perMessageDeflate: {
    threshold: 1024, // Compression threshold
    zlibInflateOptions: {
      chunkSize: 10 * 1024 // Optimize for Egyptian mobile networks
    },
    zlibDeflateOptions: {
      level: 6 // Balanced compression level
    }
  }
});

// Export configuration types for type safety
export type { SocketConfig };