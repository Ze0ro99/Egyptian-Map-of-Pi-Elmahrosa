/**
 * @fileoverview Defines comprehensive interfaces and types for the real-time messaging system
 * between buyers and sellers in the Egyptian Map of Pi marketplace. Includes message type
 * definitions, delivery status tracking, and MongoDB document structure with Arabic language support.
 */

import { BaseDocument } from '../../shared/interfaces/base.interface';

/**
 * Enum defining all possible message types supported in the messaging system.
 * Includes special types for location sharing and transaction updates.
 */
export enum MessageType {
  /**
   * Standard text message
   */
  TEXT = 'TEXT',

  /**
   * Image/media message
   */
  IMAGE = 'IMAGE',

  /**
   * System-generated notification or alert
   */
  SYSTEM = 'SYSTEM',

  /**
   * Location sharing message with coordinates
   */
  LOCATION = 'LOCATION',

  /**
   * Transaction-related update or status change
   */
  TRANSACTION = 'TRANSACTION'
}

/**
 * Enum tracking the delivery and read status of messages.
 * Includes comprehensive state management including failure handling.
 */
export enum MessageStatus {
  /**
   * Message has been sent but not yet delivered
   */
  SENT = 'SENT',

  /**
   * Message has been delivered to recipient
   */
  DELIVERED = 'DELIVERED',

  /**
   * Message has been read by recipient
   */
  READ = 'READ',

  /**
   * Message delivery failed
   */
  FAILED = 'FAILED'
}

/**
 * Interface defining the complete structure of message documents in MongoDB.
 * Extends BaseDocument to inherit standard document properties.
 * Includes support for Arabic content and rich metadata.
 */
export interface MessageDocument extends BaseDocument {
  /**
   * Reference to the transaction this message belongs to
   */
  transactionId: string;

  /**
   * ID of the user who sent the message
   */
  senderId: string;

  /**
   * ID of the message recipient
   */
  receiverId: string;

  /**
   * Primary message content in English
   */
  content: string;

  /**
   * Arabic translation of the message content
   * Required for proper Arabic language support
   */
  contentAr: string;

  /**
   * Type of message for proper rendering and handling
   */
  type: MessageType;

  /**
   * Current delivery status of the message
   */
  status: MessageStatus;

  /**
   * Additional metadata based on message type:
   * - LOCATION: coordinates, address
   * - IMAGE: dimensions, size, URL
   * - TRANSACTION: status, amount, etc.
   */
  metadata: Record<string, any>;
}