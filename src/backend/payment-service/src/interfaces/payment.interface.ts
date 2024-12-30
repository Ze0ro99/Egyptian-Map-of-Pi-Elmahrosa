/**
 * @fileoverview Defines core payment interfaces and types for handling Pi cryptocurrency 
 * payments in the Egyptian Map of Pi marketplace. This file implements the payment data
 * model and transaction security requirements as specified in the technical documentation.
 * 
 * @version 1.0.0
 * @license MIT
 */

import { BaseEntity } from '../../shared/interfaces/base.interface';

/**
 * Enumeration of possible payment statuses in the system.
 * Used to track the lifecycle of a payment from initiation to completion.
 */
export enum PaymentStatus {
  /** Payment has been initiated but not yet processed */
  PENDING = 'PENDING',
  /** Payment is currently being processed by the Pi Network */
  PROCESSING = 'PROCESSING',
  /** Payment has been successfully completed and verified */
  COMPLETED = 'COMPLETED',
  /** Payment has failed during processing */
  FAILED = 'FAILED',
  /** Payment has been refunded to the buyer */
  REFUNDED = 'REFUNDED'
}

/**
 * Core payment interface that defines the structure of payment records.
 * Extends BaseEntity to inherit standard tracking fields.
 * 
 * @interface IPayment
 * @extends {BaseEntity}
 */
export interface IPayment extends BaseEntity {
  /** Unique identifier for the payment */
  id: string;
  
  /** Amount of Pi cryptocurrency for the payment */
  amount: number;
  
  /** Current status of the payment */
  status: PaymentStatus;
  
  /** ID of the user making the payment */
  buyerId: string;
  
  /** ID of the merchant receiving the payment */
  sellerId: string;
  
  /** ID of the listing being purchased */
  listingId: string;
  
  /** ID of the associated escrow record */
  escrowId: string;
  
  /** Transaction ID from Pi Network */
  piPaymentId: string;
  
  /** Timestamp when payment was completed, null if not completed */
  completedAt: Date | null;
}

/**
 * Interface for managing payment escrow details.
 * Implements escrow functionality for secure transactions.
 * 
 * @interface IPaymentEscrow
 * @extends {BaseEntity}
 */
export interface IPaymentEscrow extends BaseEntity {
  /** Reference to the associated payment */
  paymentId: string;
  
  /** Amount held in escrow */
  amount: number;
  
  /** Scheduled date for escrow release */
  releaseDate: Date;
  
  /** Flag indicating if escrow has been released */
  isReleased: boolean;
  
  /** ID of user who authorized the release */
  releasedBy: string;
  
  /** Timestamp when escrow was released */
  releasedAt: Date;
}

/**
 * Interface for filtering and querying payments.
 * Used for payment search and reporting functionality.
 * 
 * @interface IPaymentFilter
 */
export interface IPaymentFilter {
  /** Filter by buyer ID */
  buyerId?: string;
  
  /** Filter by seller ID */
  sellerId?: string;
  
  /** Filter by payment status */
  status?: PaymentStatus;
  
  /** Filter by start date */
  startDate?: Date;
  
  /** Filter by end date */
  endDate?: Date;
  
  /** Filter by minimum amount */
  minAmount?: number;
  
  /** Filter by maximum amount */
  maxAmount?: number;
}