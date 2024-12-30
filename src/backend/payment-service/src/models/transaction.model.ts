/**
 * @fileoverview Implements a comprehensive MongoDB transaction model for the Egyptian Map of Pi marketplace.
 * Provides robust transaction tracking with blockchain integration, escrow support, and regulatory compliance.
 * Implements 7-year retention requirement with automated archival capabilities.
 * 
 * @version 1.0.0
 * @license MIT
 */

import mongoose, { Schema, Model, Document } from 'mongoose'; // v6.0.0
import { ITransaction, TransactionType } from '../interfaces/transaction.interface';
import { PaymentStatus } from '../interfaces/payment.interface';

/**
 * Extended document interface for MongoDB transaction documents
 */
interface ITransactionDocument extends ITransaction, Document {
  // Custom instance methods
  isEligibleForArchival(): boolean;
  generateRegulatoryReport(): Promise<any>;
}

/**
 * Interface for transaction model static methods
 */
interface ITransactionModel extends Model<ITransactionDocument> {
  findByBuyerId(buyerId: string, filters?: any): Promise<ITransactionDocument[]>;
  findBySellerId(sellerId: string, filters?: any): Promise<ITransactionDocument[]>;
  findByEscrowId(escrowId: string): Promise<ITransactionDocument | null>;
  findByRegulatory(criteria: any): Promise<ITransactionDocument[]>;
}

/**
 * MongoDB schema for transaction metadata including blockchain and regulatory details
 */
const TransactionMetadataSchema = new Schema({
  piTxId: { type: String, required: false },
  piBlockId: { type: String, required: false },
  piBlockHeight: { type: Number, required: false },
  piConfirmationTime: { type: Date, required: false },
  escrowContractId: { type: String, required: false },
  escrowReleaseTime: { type: Date, required: false },
  regulatoryCategory: {
    type: String,
    required: true,
    enum: ['STANDARD', 'HIGH_VALUE', 'SUSPICIOUS', 'ARCHIVED']
  },
  notes: { type: String, required: false },
  auditTrail: [{
    timestamp: { type: Date, required: true },
    action: { type: String, required: true },
    userId: { type: String, required: true },
    reason: { type: String, required: true }
  }],
  isArchived: { type: Boolean, default: false },
  archivalDate: { type: Date, required: false }
}, { _id: false });

/**
 * Core transaction schema with comprehensive validation and business logic
 */
const TransactionSchema = new Schema<ITransactionDocument>({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: Object.values(TransactionType)
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: (value: number) => value > 0,
      message: 'Amount must be greater than 0'
    }
  },
  status: {
    type: String,
    required: true,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING
  },
  buyerId: {
    type: String,
    required: true,
    index: true
  },
  sellerId: {
    type: String,
    required: true,
    index: true
  },
  listingId: {
    type: String,
    required: true,
    index: true
  },
  paymentId: {
    type: String,
    required: true,
    index: true
  },
  escrowId: {
    type: String,
    required: false,
    index: true
  },
  metadata: {
    type: TransactionMetadataSchema,
    required: true,
    default: () => ({
      regulatoryCategory: 'STANDARD',
      auditTrail: [],
      isArchived: false
    })
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now,
    expires: 7 * 365 * 24 * 60 * 60 // 7 years in seconds
  },
  updatedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    required: true,
    default: true
  }
}, {
  timestamps: true,
  versionKey: false
});

/**
 * Compound indexes for optimized queries
 */
TransactionSchema.index({ buyerId: 1, sellerId: 1, createdAt: -1 });
TransactionSchema.index({ 'metadata.regulatoryCategory': 1, createdAt: -1 });
TransactionSchema.index({ 'metadata.isArchived': 1, 'metadata.archivalDate': 1 });
TransactionSchema.index({ status: 1, createdAt: -1 });

/**
 * Instance methods for transaction documents
 */
TransactionSchema.methods.isEligibleForArchival = function(): boolean {
  const archivalThreshold = new Date();
  archivalThreshold.setFullYear(archivalThreshold.getFullYear() - 2);
  return !this.metadata.isArchived && this.createdAt < archivalThreshold;
};

TransactionSchema.methods.generateRegulatoryReport = async function(): Promise<any> {
  return {
    transactionId: this.id,
    amount: this.amount,
    category: this.metadata.regulatoryCategory,
    timestamp: this.createdAt,
    parties: {
      buyer: this.buyerId,
      seller: this.sellerId
    },
    blockchain: {
      txId: this.metadata.piTxId,
      blockId: this.metadata.piBlockId,
      confirmationTime: this.metadata.piConfirmationTime
    },
    auditTrail: this.metadata.auditTrail
  };
};

/**
 * Static methods for transaction queries
 */
TransactionSchema.statics.findByBuyerId = async function(
  buyerId: string,
  filters: any = {}
): Promise<ITransactionDocument[]> {
  return this.find({
    buyerId,
    isActive: true,
    ...filters
  }).sort({ createdAt: -1 });
};

TransactionSchema.statics.findBySellerId = async function(
  sellerId: string,
  filters: any = {}
): Promise<ITransactionDocument[]> {
  return this.find({
    sellerId,
    isActive: true,
    ...filters
  }).sort({ createdAt: -1 });
};

TransactionSchema.statics.findByEscrowId = async function(
  escrowId: string
): Promise<ITransactionDocument | null> {
  return this.findOne({
    escrowId,
    isActive: true
  });
};

TransactionSchema.statics.findByRegulatory = async function(
  criteria: any
): Promise<ITransactionDocument[]> {
  return this.find({
    'metadata.regulatoryCategory': criteria.category,
    createdAt: {
      $gte: criteria.startDate,
      $lte: criteria.endDate
    },
    isActive: true
  }).sort({ createdAt: -1 });
};

/**
 * Middleware hooks for transaction lifecycle management
 */
TransactionSchema.pre('save', function(next) {
  if (this.isNew) {
    this.metadata.auditTrail.push({
      timestamp: new Date(),
      action: 'CREATED',
      userId: this.buyerId,
      reason: 'Transaction initiated'
    });
  }
  this.updatedAt = new Date();
  next();
});

TransactionSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

/**
 * Export the Transaction model with complete type information
 */
export const Transaction = mongoose.model<ITransactionDocument, ITransactionModel>(
  'Transaction',
  TransactionSchema,
  'transactions'
);

export default Transaction;