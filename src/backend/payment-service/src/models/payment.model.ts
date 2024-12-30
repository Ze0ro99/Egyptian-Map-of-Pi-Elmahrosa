/**
 * @fileoverview Implements the MongoDB payment model for handling Pi cryptocurrency payments
 * in the Egyptian Map of Pi marketplace. This model includes enhanced security features,
 * optimistic locking, and performance optimizations through strategic indexing.
 * 
 * @version 1.0.0
 * @license MIT
 */

import { Schema, model, Model, Document } from 'mongoose'; // v6.0.0
import { encrypt } from 'mongoose-field-encryption'; // v4.0.0
import { IPayment, PaymentStatus } from '../interfaces/payment.interface';
import { BaseDocument } from '../../shared/interfaces/base.interface';

/**
 * Extended interface for Payment document with Mongoose specifics
 */
interface IPaymentDocument extends IPayment, BaseDocument, Document {
  version: number;
}

/**
 * Extended interface for Payment model with custom static methods
 */
interface IPaymentModel extends Model<IPaymentDocument> {
  findByBuyerId(buyerId: string): Promise<IPaymentDocument[]>;
  findBySellerId(sellerId: string): Promise<IPaymentDocument[]>;
  findByListingId(listingId: string): Promise<IPaymentDocument[]>;
  findByStatus(status: PaymentStatus): Promise<IPaymentDocument[]>;
  updatePaymentStatus(id: string, status: PaymentStatus): Promise<IPaymentDocument | null>;
  findPendingPayments(): Promise<IPaymentDocument[]>;
}

/**
 * MongoDB schema for Payment documents with optimistic locking and encryption
 */
const PaymentSchema = new Schema<IPaymentDocument, IPaymentModel>({
  amount: {
    type: Number,
    required: true,
    min: 0,
    index: true
  },
  status: {
    type: String,
    enum: Object.values(PaymentStatus),
    required: true,
    default: PaymentStatus.PENDING,
    index: true
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
  escrowId: {
    type: String,
    required: true,
    encrypted: true
  },
  piPaymentId: {
    type: String,
    required: true,
    unique: true,
    encrypted: true
  },
  completedAt: {
    type: Date,
    default: null
  },
  version: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  collection: 'payments',
  optimisticConcurrency: true
});

// Configure field-level encryption
PaymentSchema.plugin(encrypt, {
  fields: ['piPaymentId', 'escrowId'],
  secret: process.env.PAYMENT_ENCRYPTION_KEY || 'default-key-do-not-use-in-production'
});

// Create compound indexes for common queries
PaymentSchema.index({ buyerId: 1, status: 1 }, { background: true });
PaymentSchema.index({ sellerId: 1, status: 1 }, { background: true });
PaymentSchema.index({ status: 1, createdAt: 1 }, { background: true });
PaymentSchema.index({ piPaymentId: 1 }, { unique: true, background: true });

// Implement static methods
PaymentSchema.statics.findByBuyerId = async function(buyerId: string): Promise<IPaymentDocument[]> {
  return this.find({ buyerId, isActive: true }).sort({ createdAt: -1 });
};

PaymentSchema.statics.findBySellerId = async function(sellerId: string): Promise<IPaymentDocument[]> {
  return this.find({ sellerId, isActive: true }).sort({ createdAt: -1 });
};

PaymentSchema.statics.findByListingId = async function(listingId: string): Promise<IPaymentDocument[]> {
  return this.find({ listingId, isActive: true });
};

PaymentSchema.statics.findByStatus = async function(status: PaymentStatus): Promise<IPaymentDocument[]> {
  return this.find({ status, isActive: true }).sort({ createdAt: -1 });
};

PaymentSchema.statics.updatePaymentStatus = async function(
  id: string,
  status: PaymentStatus
): Promise<IPaymentDocument | null> {
  const updates: Partial<IPaymentDocument> = {
    status,
    completedAt: status === PaymentStatus.COMPLETED ? new Date() : null,
    version: this.version + 1
  };
  
  return this.findOneAndUpdate(
    { _id: id, isActive: true },
    { $set: updates },
    { new: true, runValidators: true }
  );
};

PaymentSchema.statics.findPendingPayments = async function(): Promise<IPaymentDocument[]> {
  return this.find({
    status: PaymentStatus.PENDING,
    isActive: true,
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  }).sort({ createdAt: 1 });
};

// Pre-save middleware for version increment (optimistic locking)
PaymentSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.version += 1;
  }
  next();
});

// Create and export the Payment model
export const Payment = model<IPaymentDocument, IPaymentModel>('Payment', PaymentSchema);
export { PaymentSchema };