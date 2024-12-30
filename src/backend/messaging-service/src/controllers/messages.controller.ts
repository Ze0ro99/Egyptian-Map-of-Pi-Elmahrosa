/**
 * @fileoverview Enhanced messages controller for Egyptian Map of Pi marketplace
 * Implements real-time messaging with Arabic language support and network resilience
 * Version: 1.0.0
 */

import { injectable, inject } from 'inversify'; // v5.1.1
import { controller, httpPost, httpGet, httpPatch } from 'inversify-express-utils'; // v6.4.3
import { Request, Response } from 'express'; // v4.18.2
import { RateLimiter } from 'rate-limiter-flexible'; // v2.4.1
import validator from 'validator'; // v13.9.0
import { MessageDocument, MessageType, MessageStatus } from '../interfaces/message.interface';
import { SocketService } from '../services/socket.service';

// Constants for rate limiting and validation
const RATE_LIMITS = {
  MESSAGES_PER_MINUTE: 60,
  STATUS_UPDATES_PER_MINUTE: 30
} as const;

// Arabic text validation regex
const ARABIC_TEXT_REGEX = /[\u0600-\u06FF]/;

/**
 * Enhanced messages controller with comprehensive Arabic support and network resilience
 */
@injectable()
@controller('/messages')
export class MessagesController {
  constructor(
    @inject('SocketService') private socketService: SocketService,
    @inject('NotificationService') private notificationService: any,
    @inject('RateLimiter') private rateLimiter: RateLimiter,
    @inject('NetworkMonitor') private networkMonitor: any
  ) {}

  /**
   * Sends a new message with enhanced Arabic support and network resilience
   * 
   * @param req - Express request object containing message data
   * @param res - Express response object
   * @returns Promise<Response> - Response containing created message with metadata
   */
  @httpPost('/')
  async sendMessage(req: Request, res: Response): Promise<Response> {
    try {
      // Rate limiting check
      const rateLimitResult = await this.rateLimiter.consume(req.ip, 1);
      if (rateLimitResult.remainingPoints <= 0) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.msBeforeNext
        });
      }

      // Validate required fields
      const { transactionId, content, receiverId, type } = req.body;
      if (!transactionId || !content || !receiverId || !type) {
        return res.status(400).json({
          error: 'Missing required fields',
          requiredFields: ['transactionId', 'content', 'receiverId', 'type']
        });
      }

      // Enhanced content validation with Arabic support
      const sanitizedContent = this.sanitizeContent(content);
      const contentDirection = ARABIC_TEXT_REGEX.test(content) ? 'rtl' : 'ltr';
      
      // Create message document
      const message: Partial<MessageDocument> = {
        transactionId,
        senderId: req.user.id,
        receiverId,
        content: sanitizedContent,
        type: type as MessageType,
        status: MessageStatus.SENT,
        direction: contentDirection,
        metadata: {
          deviceInfo: req.headers['user-agent'],
          networkQuality: await this.networkMonitor.getQuality(),
          timestamp: new Date()
        }
      };

      // Implement retry logic for network resilience
      const retryConfig = {
        maxAttempts: 3,
        backoffMs: 1000
      };

      let deliveryAttempt = 0;
      let messageDelivered = false;

      while (deliveryAttempt < retryConfig.maxAttempts && !messageDelivered) {
        try {
          // Attempt to deliver message
          await this.socketService.handleMessage(message);
          messageDelivered = true;
        } catch (error) {
          deliveryAttempt++;
          if (deliveryAttempt < retryConfig.maxAttempts) {
            await new Promise(resolve => 
              setTimeout(resolve, retryConfig.backoffMs * deliveryAttempt)
            );
          } else {
            throw error;
          }
        }
      }

      // Send notification with language support
      await this.notificationService.sendMessageNotification({
        userId: receiverId,
        message: {
          ...message,
          preview: this.getMessagePreview(sanitizedContent, contentDirection)
        },
        language: contentDirection === 'rtl' ? 'ar' : 'en'
      });

      return res.status(201).json({
        message: 'Message sent successfully',
        data: {
          ...message,
          deliveryAttempts: deliveryAttempt,
          networkQuality: message.metadata.networkQuality
        }
      });

    } catch (error) {
      console.error('Message sending error:', error);
      return res.status(500).json({
        error: 'Failed to send message',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Updates message status with enhanced tracking
   * 
   * @param req - Express request object containing status update
   * @param res - Express response object
   * @returns Promise<Response> - Response containing updated status
   */
  @httpPatch('/:messageId/status')
  async updateMessageStatus(req: Request, res: Response): Promise<Response> {
    try {
      const { messageId } = req.params;
      const { status } = req.body;

      if (!Object.values(MessageStatus).includes(status)) {
        return res.status(400).json({
          error: 'Invalid message status',
          validStatuses: Object.values(MessageStatus)
        });
      }

      await this.socketService.handleStatusUpdate({
        messageId,
        status,
        updatedAt: new Date(),
        updatedBy: req.user.id
      });

      return res.status(200).json({
        message: 'Message status updated successfully',
        data: { messageId, status }
      });

    } catch (error) {
      console.error('Status update error:', error);
      return res.status(500).json({
        error: 'Failed to update message status'
      });
    }
  }

  /**
   * Sanitizes message content with enhanced security
   * 
   * @param content - Raw message content
   * @returns string - Sanitized content
   */
  private sanitizeContent(content: string): string {
    // Remove potentially harmful characters while preserving Arabic text
    let sanitized = validator.escape(content);
    sanitized = sanitized.replace(/[^\u0000-\u007E\u0600-\u06FF\s]/g, '');
    return sanitized.trim();
  }

  /**
   * Generates message preview with proper text direction
   * 
   * @param content - Message content
   * @param direction - Text direction
   * @returns string - Formatted message preview
   */
  private getMessagePreview(content: string, direction: string): string {
    const maxLength = 50;
    const preview = content.length > maxLength 
      ? `${content.substring(0, maxLength)}...` 
      : content;
    
    return direction === 'rtl' 
      ? `\u202B${preview}\u202C` // Add RTL markers for Arabic
      : preview;
  }
}