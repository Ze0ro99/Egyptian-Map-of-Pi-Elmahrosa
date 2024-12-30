/**
 * @fileoverview Defines the MongoDB schema and model for conversations between buyers and sellers
 * in the Egyptian Map of Pi marketplace. Implements real-time messaging capabilities with proper
 * indexing and Arabic language support.
 */

import { Schema, model, Types } from 'mongoose'; // v6.0.0
import { BaseDocument } from '../../shared/interfaces/base.interface';
import { MessageDocument } from '../interfaces/message.interface';

/**
 * Interface defining the structure of a conversation document
 */
export interface ConversationDocument extends BaseDocument {
  transactionId: string;
  buyerId: string;
  sellerId: string;
  lastMessageAt: Date;
  isActive: boolean;
  messages?: MessageDocument[];
}

/**
 * Configuration for Arabic language support in text fields
 */
const ARABIC_COLLATION = {
  locale: 'ar',
  strength: 2,
  numericOrdering: true
};

/**
 * TTL for inactive conversations (30 days)
 */
const CONVERSATION_TTL_DAYS = 30;

/**
 * Collection name for conversations
 */
export const CONVERSATION_COLLECTION = 'conversations';

/**
 * Validates that conversation participants are different users with valid IDs
 */
const validateParticipants = (buyerId: string, sellerId: string): boolean => {
  if (!buyerId || !sellerId) {
    return false;
  }

  // Ensure IDs are valid MongoDB ObjectIds
  if (!Types.ObjectId.isValid(buyerId) || !Types.ObjectId.isValid(sellerId)) {
    return false;
  }

  // Ensure buyer and seller are different users
  return buyerId !== sellerId;
};

/**
 * Schema definition for conversations with comprehensive indexing and Arabic support
 */
const ConversationSchema = new Schema<ConversationDocument>(
  {
    transactionId: {
      type: String,
      required: [true, 'Transaction ID is required'],
      validate: {
        validator: (v: string) => Types.ObjectId.isValid(v),
        message: 'Invalid transaction ID format'
      }
    },
    buyerId: {
      type: String,
      required: [true, 'Buyer ID is required'],
      validate: {
        validator: (v: string) => Types.ObjectId.isValid(v),
        message: 'Invalid buyer ID format'
      }
    },
    sellerId: {
      type: String,
      required: [true, 'Seller ID is required'],
      validate: {
        validator: (v: string) => Types.ObjectId.isValid(v),
        message: 'Invalid seller ID format'
      }
    },
    lastMessageAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
      index: true
    }
  },
  {
    timestamps: true,
    collection: CONVERSATION_COLLECTION,
    collation: ARABIC_COLLATION,
    strict: true,
    validateBeforeSave: true
  }
);

// Compound index for efficient conversation lookup by transaction and last message time
ConversationSchema.index(
  { transactionId: 1, lastMessageAt: -1 },
  { background: true }
);

// Indexes for participant-based queries
ConversationSchema.index({ buyerId: 1, isActive: 1 }, { background: true });
ConversationSchema.index({ sellerId: 1, isActive: 1 }, { background: true });

// TTL index for automatic cleanup of inactive conversations
ConversationSchema.index(
  { lastMessageAt: 1 },
  { 
    expireAfterSeconds: CONVERSATION_TTL_DAYS * 24 * 60 * 60,
    background: true 
  }
);

// Validate participants before saving
ConversationSchema.pre('save', function(next) {
  if (!validateParticipants(this.buyerId, this.sellerId)) {
    next(new Error('Invalid conversation participants'));
  }
  next();
});

// Virtual for populating messages (used when needed)
ConversationSchema.virtual('messages', {
  ref: 'Message',
  localField: 'transactionId',
  foreignField: 'transactionId'
});

// Enable change streams for real-time updates
ConversationSchema.set('timestamps', true);

// Configure optimistic concurrency control
ConversationSchema.set('optimisticConcurrency', true);

/**
 * Mongoose model for conversation operations with proper typing and indexing
 */
export const ConversationModel = model<ConversationDocument>(
  'Conversation',
  ConversationSchema
);

/**
 * Export type for external use
 */
export type Conversation = ConversationDocument;