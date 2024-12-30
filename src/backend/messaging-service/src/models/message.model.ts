/**
 * @fileoverview Implements MongoDB schema and model for chat messages in the Egyptian Map of Pi marketplace.
 * Provides comprehensive message validation, status tracking, and Arabic content support.
 * @version 1.0.0
 */

import { Schema, model } from 'mongoose'; // v6.0.0
import { MessageDocument, MessageType, MessageStatus } from '../interfaces/message.interface';

// Constants for message configuration
const MESSAGE_COLLECTION = 'messages';
const MAX_TEXT_LENGTH = 5000;
const MESSAGE_TTL_DAYS = 365;
const MAX_METADATA_SIZE = 16384; // 16KB max metadata size

/**
 * Validates message content based on type with support for Arabic text
 * @param content - Message content to validate
 * @param type - Type of message
 * @returns boolean indicating content validity
 */
const validateMessageContent = (content: string, type: MessageType): boolean => {
  if (!content || content.trim().length === 0) {
    return false;
  }

  switch (type) {
    case MessageType.TEXT:
    case MessageType.SYSTEM:
      return content.length <= MAX_TEXT_LENGTH;
    
    case MessageType.IMAGE:
      try {
        const url = new URL(content);
        return url.protocol === 'https:';
      } catch {
        return false;
      }
      
    default:
      return true;
  }
};

/**
 * Validates message metadata structure and content
 * @param metadata - Metadata object to validate
 * @returns boolean indicating metadata validity
 */
const validateMetadata = (metadata: Record<string, any>): boolean => {
  if (!metadata || typeof metadata !== 'object') {
    return false;
  }

  // Check metadata size
  const metadataSize = Buffer.from(JSON.stringify(metadata)).length;
  if (metadataSize > MAX_METADATA_SIZE) {
    return false;
  }

  return true;
};

// Define the message schema with comprehensive validation
const MessageSchema = new Schema<MessageDocument>({
  transactionId: {
    type: String,
    required: [true, 'Transaction ID is required'],
    index: true
  },
  senderId: {
    type: String,
    required: [true, 'Sender ID is required'],
    index: true
  },
  receiverId: {
    type: String,
    required: [true, 'Receiver ID is required'],
    index: true
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    validate: {
      validator: function(this: MessageDocument, content: string) {
        return validateMessageContent(content, this.type);
      },
      message: 'Invalid message content for the specified type'
    }
  },
  contentAr: {
    type: String,
    validate: {
      validator: function(content: string) {
        // Validate Arabic content if present
        if (content) {
          const arabicRegex = /[\u0600-\u06FF]/;
          return arabicRegex.test(content) && content.length <= MAX_TEXT_LENGTH;
        }
        return true;
      },
      message: 'Invalid Arabic content'
    }
  },
  type: {
    type: String,
    enum: Object.values(MessageType),
    required: [true, 'Message type is required'],
    index: true
  },
  status: {
    type: String,
    enum: Object.values(MessageStatus),
    default: MessageStatus.SENT,
    required: true,
    index: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    validate: {
      validator: validateMetadata,
      message: 'Invalid metadata structure or size'
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    required: true,
    index: true
  }
}, {
  timestamps: true,
  collection: MESSAGE_COLLECTION
});

// Create compound indexes for efficient querying
MessageSchema.index({ transactionId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });

// Add TTL index for automatic message cleanup after 1 year
MessageSchema.index({ createdAt: 1 }, { 
  expireAfterSeconds: MESSAGE_TTL_DAYS * 24 * 60 * 60 
});

// Create and export the Message model
export const MessageModel = model<MessageDocument>(MESSAGE_COLLECTION, MessageSchema);

// Export validation utilities for use in other modules
export { validateMessageContent, validateMetadata };