/**
 * @fileoverview Defines TypeScript interfaces for real-time messaging system in the Egyptian Map of Pi marketplace.
 * Implements comprehensive message data structures with support for Arabic language (RTL),
 * Egyptian market requirements, and secure buyer-seller communication.
 * @version 1.0.0
 */

import { IPayment } from '../interfaces/payment.interface';

/**
 * Enumeration of supported message types in the marketplace
 * Implements comprehensive message categorization for Egyptian market
 */
export enum MessageType {
  /** Standard text message with Arabic support */
  TEXT = 'TEXT',
  
  /** Image message for product photos/documentation */
  IMAGE = 'IMAGE',
  
  /** System-generated messages (e.g., transaction updates) */
  SYSTEM = 'SYSTEM'
}

/**
 * Enumeration of message delivery statuses
 * Tracks message lifecycle with Egyptian timezone support
 */
export enum MessageStatus {
  /** Message sent but not yet delivered */
  SENT = 'SENT',
  
  /** Message delivered to recipient */
  DELIVERED = 'DELIVERED',
  
  /** Message read by recipient */
  READ = 'READ'
}

/**
 * Core message interface with Arabic language and RTL support
 * Implements secure messaging requirements for Egyptian marketplace
 */
export interface IMessage {
  /** Unique message identifier */
  id: string;

  /** Associated transaction identifier */
  transactionId: string;

  /** Pi Network ID of message sender */
  senderId: string;

  /** Message content (supports Arabic text) */
  content: string;

  /** Type of message */
  type: MessageType;

  /** Current delivery status */
  status: MessageStatus;

  /** Message creation timestamp (Egyptian timezone) */
  createdAt: Date;

  /** Last status update timestamp */
  updatedAt: Date;
}

/**
 * Conversation interface for managing chat metadata and tracking
 * Implements Egyptian market compliance requirements
 */
export interface IConversation {
  /** Unique conversation identifier */
  id: string;

  /** Associated transaction identifier */
  transactionId: string;

  /** Pi Network ID of buyer */
  buyerId: string;

  /** Pi Network ID of seller */
  sellerId: string;

  /** Most recent message in conversation */
  lastMessage: IMessage;

  /** Count of unread messages */
  unreadCount: number;

  /** Conversation creation timestamp */
  createdAt: Date;

  /** Last activity timestamp */
  updatedAt: Date;
}

/**
 * Type guard to check if a value is a valid MessageType
 * @param value - Value to check
 * @returns boolean indicating if value is a valid MessageType
 */
export function isMessageType(value: any): value is MessageType {
  return Object.values(MessageType).includes(value as MessageType);
}

/**
 * Type guard to check if a value is a valid MessageStatus
 * @param value - Value to check
 * @returns boolean indicating if value is a valid MessageStatus
 */
export function isMessageStatus(value: any): value is MessageStatus {
  return Object.values(MessageStatus).includes(value as MessageStatus);
}

/**
 * Type for message update operations
 * Ensures partial updates maintain message integrity
 */
export type MessageUpdate = Partial<Omit<IMessage, 'id' | 'transactionId' | 'senderId' | 'createdAt'>>;

/**
 * Type for conversation update operations
 * Ensures partial updates maintain conversation integrity
 */
export type ConversationUpdate = Partial<Omit<IConversation, 'id' | 'transactionId' | 'buyerId' | 'sellerId' | 'createdAt'>>;

/**
 * Interface for message filtering with Egyptian market specifics
 * Supports comprehensive message search and filtering
 */
export interface MessageFilter {
  /** Filter by transaction ID */
  transactionId?: string;

  /** Filter by sender ID */
  senderId?: string;

  /** Filter by message type */
  type?: MessageType;

  /** Filter by message status */
  status?: MessageStatus;

  /** Filter by start date */
  startDate?: Date;

  /** Filter by end date */
  endDate?: Date;
}