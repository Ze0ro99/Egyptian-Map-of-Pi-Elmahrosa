/**
 * @fileoverview Socket service implementation for real-time messaging in Egyptian Map of Pi
 * Provides secure, scalable messaging with Arabic language support and transaction integration
 * Version: 1.0.0
 */

import { injectable } from 'inversify';
import { Server, Socket } from 'socket.io'; // v4.7.0
import { RedisAdapter } from '@socket.io/redis-adapter'; // v8.2.1
import { PiAuthService } from '@pi-network/auth'; // v1.0.0
import { socketConfig } from '../config/socket.config';
import { MessageType, MessageStatus } from '../interfaces/message.interface';
import * as http from 'http';

/**
 * Enhanced socket events interface with transaction and cultural support
 */
interface SocketEvents {
  NEW_MESSAGE: 'new_message';
  MESSAGE_STATUS: 'message_status';
  USER_TYPING: 'user_typing';
  USER_ONLINE: 'user_online';
  USER_OFFLINE: 'user_offline';
  TRANSACTION_UPDATE: 'transaction_update';
  CONNECTION_QUALITY: 'connection_quality';
  RATE_LIMIT_WARNING: 'rate_limit_warning';
}

/**
 * Rate limiting configuration for different event types
 */
const RATE_LIMITS = {
  MESSAGES_PER_MINUTE: 60,
  TYPING_EVENTS_PER_MINUTE: 30,
  STATUS_UPDATES_PER_MINUTE: 20
} as const;

/**
 * Socket service managing real-time communication with comprehensive features
 */
@injectable()
export class SocketService {
  private io: Server;
  private connectedUsers: Map<string, Socket>;
  private userMessageCounts: Map<string, number>;
  private lastMessageTimes: Map<string, number>;
  private readonly redisAdapter: RedisAdapter;
  private readonly piAuthService: PiAuthService;

  /**
   * Initializes the Socket service with required dependencies
   */
  constructor(
    piAuthService: PiAuthService,
    redisAdapter: RedisAdapter
  ) {
    this.piAuthService = piAuthService;
    this.redisAdapter = redisAdapter;
    this.connectedUsers = new Map();
    this.userMessageCounts = new Map();
    this.lastMessageTimes = new Map();
  }

  /**
   * Initializes Socket.IO server with comprehensive configuration
   */
  public initialize(httpServer: http.Server): void {
    this.io = new Server(httpServer, socketConfig);
    this.setupRedisAdapter();
    this.setupMiddleware();
    this.setupEventHandlers();
    this.setupMetrics();
  }

  /**
   * Configures Redis adapter for horizontal scaling
   */
  private setupRedisAdapter(): void {
    this.io.adapter(this.redisAdapter);
  }

  /**
   * Sets up authentication and security middleware
   */
  private setupMiddleware(): void {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        const user = await this.piAuthService.verifyToken(token);
        socket.data.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Configures comprehensive event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
      this.setupMessageHandlers(socket);
      this.setupStatusHandlers(socket);
      this.setupTransactionHandlers(socket);
      this.setupDisconnection(socket);
    });
  }

  /**
   * Handles new socket connections
   */
  private handleConnection(socket: Socket): void {
    const userId = socket.data.user.id;
    this.connectedUsers.set(userId, socket);
    this.broadcastUserStatus(userId, true);
    this.setupConnectionQualityMonitoring(socket);
  }

  /**
   * Sets up message-related event handlers
   */
  private setupMessageHandlers(socket: Socket): void {
    socket.on('new_message', async (data) => {
      if (!this.checkRateLimit(socket)) return;

      try {
        const processedContent = await this.handleArabicContent(
          data.content,
          data.direction
        );
        
        const message = {
          senderId: socket.data.user.id,
          receiverId: data.receiverId,
          content: processedContent,
          contentAr: data.contentAr,
          type: data.type,
          transactionId: data.transactionId,
          metadata: data.metadata
        };

        await this.deliverMessage(message);
        this.updateMessageStatus(message.id, MessageStatus.DELIVERED);
      } catch (error) {
        this.handleMessageError(socket, error);
      }
    });
  }

  /**
   * Processes and validates Arabic message content
   */
  private async handleArabicContent(
    content: string,
    direction: 'rtl' | 'ltr'
  ): Promise<string> {
    // Validate Arabic character encoding
    const arabicRegex = /[\u0600-\u06FF]/;
    const containsArabic = arabicRegex.test(content);

    // Apply RTL formatting if needed
    if (containsArabic || direction === 'rtl') {
      content = `\u202B${content}\u202C`;
    }

    // Sanitize content
    content = this.sanitizeContent(content);
    return content;
  }

  /**
   * Sets up transaction-related event handlers
   */
  private setupTransactionHandlers(socket: Socket): void {
    socket.on('transaction_update', async (data) => {
      try {
        const { transactionId, status, metadata } = data;
        await this.broadcastTransactionUpdate(transactionId, status, metadata);
      } catch (error) {
        this.handleTransactionError(socket, error);
      }
    });
  }

  /**
   * Implements rate limiting for message sending
   */
  private checkRateLimit(socket: Socket): boolean {
    const userId = socket.data.user.id;
    const now = Date.now();
    const messageCount = this.userMessageCounts.get(userId) || 0;
    const lastMessageTime = this.lastMessageTimes.get(userId) || 0;

    // Reset counter after 1 minute
    if (now - lastMessageTime > 60000) {
      this.userMessageCounts.set(userId, 1);
      this.lastMessageTimes.set(userId, now);
      return true;
    }

    if (messageCount >= RATE_LIMITS.MESSAGES_PER_MINUTE) {
      socket.emit('rate_limit_warning', {
        message: 'Message rate limit exceeded. Please wait.',
        resetTime: lastMessageTime + 60000
      });
      return false;
    }

    this.userMessageCounts.set(userId, messageCount + 1);
    return true;
  }

  /**
   * Monitors connection quality and handles degradation
   */
  private setupConnectionQualityMonitoring(socket: Socket): void {
    const interval = setInterval(() => {
      const start = Date.now();
      socket.emit('ping', () => {
        const latency = Date.now() - start;
        socket.emit('connection_quality', { latency });
        
        if (latency > socketConfig.connectionQualityConfig.degradationThreshold) {
          this.handleConnectionDegradation(socket);
        }
      });
    }, socketConfig.connectionQualityConfig.healthCheckInterval);

    socket.on('disconnect', () => {
      clearInterval(interval);
    });
  }

  /**
   * Handles connection quality degradation
   */
  private handleConnectionDegradation(socket: Socket): void {
    socket.emit('connection_quality_warning', {
      message: 'Connection quality is degraded. Messages may be delayed.',
      recommendations: [
        'Check your internet connection',
        'Try reconnecting to the network',
        'Move to a location with better signal'
      ]
    });
  }

  /**
   * Sets up metrics collection for monitoring
   */
  private setupMetrics(): void {
    setInterval(() => {
      const metrics = {
        connectedUsers: this.connectedUsers.size,
        messageRate: Array.from(this.userMessageCounts.values())
          .reduce((sum, count) => sum + count, 0),
        activeTransactions: this.io.sockets.adapter.rooms.size
      };
      // Emit metrics for collection
      this.io.emit('metrics_update', metrics);
    }, 60000);
  }

  /**
   * Sanitizes message content for security
   */
  private sanitizeContent(content: string): string {
    // Remove potentially harmful characters and scripts
    content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    content = content.replace(/[^\u0000-\u007E\u0600-\u06FF\s]/g, '');
    return content.trim();
  }

  /**
   * Handles socket disconnection
   */
  private setupDisconnection(socket: Socket): void {
    socket.on('disconnect', () => {
      const userId = socket.data.user.id;
      this.connectedUsers.delete(userId);
      this.broadcastUserStatus(userId, false);
      this.cleanupUserData(userId);
    });
  }

  /**
   * Cleans up user-related data on disconnection
   */
  private cleanupUserData(userId: string): void {
    this.userMessageCounts.delete(userId);
    this.lastMessageTimes.delete(userId);
  }
}