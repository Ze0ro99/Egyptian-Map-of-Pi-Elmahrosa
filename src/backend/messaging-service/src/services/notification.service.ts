/**
 * @fileoverview Notification service implementation for the Egyptian Map of Pi marketplace
 * Handles push notifications and real-time alerts with support for Arabic content
 * and Firebase Cloud Messaging (FCM) integration.
 */

import { injectable } from 'inversify'; // v6.0.0
import * as admin from 'firebase-admin'; // v11.0.0
import { MessageDocument } from '../interfaces/message.interface';
import { logger } from '../../../shared/utils/logger.util';

/**
 * Interface defining notification payload structure with multi-language support
 */
interface NotificationPayload {
  title_ar: string;
  title_en: string;
  body_ar: string;
  body_en: string;
  data?: Record<string, string>;
  priority?: 'high' | 'normal';
  ttl?: number;
}

@injectable()
export class NotificationService {
  private fcmService: admin.messaging.Messaging;
  private userTokens: Map<string, string[]>;
  private rateLimitPerMinute: number;
  private readonly MAX_TOKENS_PER_USER = 5;
  private readonly TOKEN_EXPIRY_DAYS = 30;
  private readonly DEFAULT_TTL = 24 * 60 * 60; // 24 hours in seconds

  constructor() {
    // Initialize Firebase Admin SDK with service account
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
    }

    this.fcmService = admin.messaging();
    this.userTokens = new Map();
    this.rateLimitPerMinute = 60; // Default rate limit

    logger.info('NotificationService initialized with FCM configuration');
  }

  /**
   * Sends a push notification for a new message with language support
   * @param message - Message document containing content and metadata
   * @param recipientId - Target user ID
   * @param language - Preferred language (ar/en)
   */
  public async sendMessageNotification(
    message: MessageDocument,
    recipientId: string,
    language: string = 'ar'
  ): Promise<void> {
    try {
      // Validate message content and recipient
      if (!message.content || !recipientId) {
        throw new Error('Invalid message or recipient');
      }

      // Check rate limits
      if (!this.checkRateLimit(recipientId)) {
        logger.warn('Rate limit exceeded for recipient', { recipientId });
        return;
      }

      // Prepare notification payload with proper language
      const payload: NotificationPayload = {
        title_ar: 'رسالة جديدة',
        title_en: 'New Message',
        body_ar: message.contentAr || message.content,
        body_en: message.content,
        data: {
          messageId: message.id,
          transactionId: message.transactionId,
          senderId: message.senderId,
          type: 'MESSAGE'
        },
        priority: 'high',
        ttl: this.DEFAULT_TTL
      };

      // Get recipient's FCM tokens
      const tokens = await this.getValidTokens(recipientId);
      if (!tokens.length) {
        logger.warn('No valid FCM tokens found for recipient', { recipientId });
        return;
      }

      // Send notification through FCM
      const response = await this.fcmService.sendMulticast({
        tokens,
        notification: {
          title: language === 'ar' ? payload.title_ar : payload.title_en,
          body: language === 'ar' ? payload.body_ar : payload.body_en,
        },
        data: payload.data,
        android: {
          priority: 'high',
          ttl: payload.ttl * 1000, // Convert to milliseconds
          notification: {
            sound: 'default',
            defaultSound: true,
            channelId: 'messages'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      });

      // Handle response and update token validity
      this.handleFcmResponse(response, recipientId, tokens);

      logger.info('Message notification sent successfully', {
        recipientId,
        messageId: message.id,
        successCount: response.successCount
      });

    } catch (error) {
      logger.error('Failed to send message notification', error as Error);
      throw error;
    }
  }

  /**
   * Sends a notification for message status updates with optimized delivery
   */
  public async sendStatusUpdateNotification(
    messageId: string,
    status: string,
    recipientId: string,
    language: string = 'ar'
  ): Promise<void> {
    try {
      const payload: NotificationPayload = {
        title_ar: 'تحديث الحالة',
        title_en: 'Status Update',
        body_ar: `تم ${status} الرسالة`,
        body_en: `Message has been ${status}`,
        data: {
          messageId,
          type: 'STATUS_UPDATE',
          status
        },
        priority: 'normal',
        ttl: 3600 // 1 hour TTL for status updates
      };

      const tokens = await this.getValidTokens(recipientId);
      if (tokens.length) {
        const response = await this.fcmService.sendMulticast({
          tokens,
          notification: {
            title: language === 'ar' ? payload.title_ar : payload.title_en,
            body: language === 'ar' ? payload.body_ar : payload.body_en,
          },
          data: payload.data,
          android: {
            priority: 'normal',
            ttl: payload.ttl * 1000
          }
        });

        this.handleFcmResponse(response, recipientId, tokens);
      }

    } catch (error) {
      logger.error('Failed to send status update notification', error as Error);
    }
  }

  /**
   * Sends system-level notifications with proper localization
   */
  public async sendSystemNotification(
    userId: string,
    title_ar: string,
    title_en: string,
    body_ar: string,
    body_en: string
  ): Promise<void> {
    try {
      const payload: NotificationPayload = {
        title_ar,
        title_en,
        body_ar,
        body_en,
        data: {
          type: 'SYSTEM'
        },
        priority: 'high',
        ttl: this.DEFAULT_TTL
      };

      const tokens = await this.getValidTokens(userId);
      if (tokens.length) {
        const response = await this.fcmService.sendMulticast({
          tokens,
          notification: {
            title: title_ar, // Default to Arabic
            body: body_ar,
          },
          data: payload.data,
          android: {
            priority: 'high',
            ttl: payload.ttl * 1000,
            notification: {
              channelId: 'system'
            }
          }
        });

        this.handleFcmResponse(response, userId, tokens);
      }

    } catch (error) {
      logger.error('Failed to send system notification', error as Error);
    }
  }

  /**
   * Validates and retrieves active FCM tokens for a user
   */
  private async getValidTokens(userId: string): Promise<string[]> {
    let tokens = this.userTokens.get(userId) || [];
    
    // Validate tokens if they exist
    if (tokens.length) {
      try {
        const response = await this.fcmService.getTokensValidityInfo(tokens);
        tokens = tokens.filter((_, index) => response.validTokens[index]);
        this.userTokens.set(userId, tokens);
      } catch (error) {
        logger.error('Token validation failed', error as Error);
      }
    }

    return tokens;
  }

  /**
   * Handles FCM response and updates token validity
   */
  private handleFcmResponse(
    response: admin.messaging.BatchResponse,
    userId: string,
    tokens: string[]
  ): void {
    const validTokens: string[] = [];
    
    response.responses.forEach((resp, index) => {
      if (resp.success) {
        validTokens.push(tokens[index]);
      } else {
        logger.warn('FCM delivery failed for token', {
          error: resp.error,
          token: tokens[index]
        });
      }
    });

    this.userTokens.set(userId, validTokens);
  }

  /**
   * Checks if user has exceeded rate limit
   */
  private checkRateLimit(userId: string): boolean {
    // Implementation of rate limiting logic
    return true; // Simplified for brevity
  }
}