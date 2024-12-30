/**
 * @fileoverview Defines comprehensive transaction interfaces and types for the Egyptian Map of Pi marketplace.
 * Implements transaction data models with blockchain integration, escrow functionality, and regulatory compliance.
 * Supports 7-year retention requirement with archival capabilities as specified in technical documentation.
 * 
 * @version 1.0.0
 * @license MIT
 */

import { BaseEntity } from '../../shared/interfaces/base.interface';
import { PaymentStatus } from './payment.interface';

/**
 * Enhanced enumeration of transaction types including escrow operations
 * and system-level adjustments for the Egyptian marketplace.
 */
export enum TransactionType {
  /** Standard product/service purchase */
  PURCHASE = 'PURCHASE',
  /** Refund to buyer */
  REFUND = 'REFUND',
  /** Release of funds from escrow to seller */
  ESCROW_RELEASE = 'ESCROW_RELEASE',
  /** Return of funds from escrow to buyer */
  ESCROW_RETURN = 'ESCROW_RETURN',
  /** System-level transaction adjustment */
  SYSTEM_ADJUSTMENT = 'SYSTEM_ADJUSTMENT'
}

/**
 * Comprehensive interface for transaction metadata including blockchain 
 * and regulatory information. Supports audit requirements and archival tracking.
 */
export interface ITransactionMetadata {
  /** Pi Network transaction identifier */
  piTxId: string;
  
  /** Block identifier containing the transaction */
  piBlockId: string;
  
  /** Block height for transaction confirmation */
  piBlockHeight: number;
  
  /** Timestamp of blockchain confirmation */
  piConfirmationTime: Date;
  
  /** Smart contract ID for escrow transactions */
  escrowContractId: string;
  
  /** Timestamp when escrow was released */
  escrowReleaseTime: Date;
  
  /** Egyptian regulatory classification */
  regulatoryCategory: string;
  
  /** Additional transaction notes */
  notes: string;
  
  /** Audit trail for transaction modifications */
  auditTrail: {
    timestamp: Date;
    action: string;
    userId: string;
    reason: string;
  }[];
  
  /** Archival status flag */
  isArchived: boolean;
  
  /** Date when transaction was archived */
  archivalDate: Date;
}

/**
 * Core transaction interface implementing the complete transaction data model
 * with blockchain integration and metadata tracking capabilities.
 * 
 * @extends {BaseEntity}
 */
export interface ITransaction extends BaseEntity {
  /** Unique transaction identifier */
  id: string;
  
  /** Transaction type classification */
  type: TransactionType;
  
  /** Transaction amount in Pi cryptocurrency */
  amount: number;
  
  /** Current transaction status */
  status: PaymentStatus;
  
  /** ID of the buyer/sender */
  buyerId: string;
  
  /** ID of the seller/recipient */
  sellerId: string;
  
  /** Associated marketplace listing ID */
  listingId: string;
  
  /** Reference to payment record */
  paymentId: string;
  
  /** Reference to escrow record if applicable */
  escrowId: string;
  
  /** Comprehensive transaction metadata */
  metadata: ITransactionMetadata;
}

/**
 * Interface for advanced transaction filtering and queries.
 * Supports comprehensive search capabilities for transaction management.
 */
export interface ITransactionFilter {
  /** Filter by buyer ID */
  buyerId?: string;
  
  /** Filter by seller ID */
  sellerId?: string;
  
  /** Filter by transaction type */
  type?: TransactionType;
  
  /** Filter by transaction status */
  status?: PaymentStatus;
  
  /** Filter by start date */
  startDate?: Date;
  
  /** Filter by end date */
  endDate?: Date;
  
  /** Filter by minimum amount */
  minAmount?: number;
  
  /** Filter by maximum amount */
  maxAmount?: number;
  
  /** Filter by escrow ID */
  escrowId?: string;
  
  /** Include archived transactions */
  includeArchived?: boolean;
  
  /** Filter by regulatory category */
  regulatoryCategory?: string;
  
  /** Filter by multiple transaction types */
  transactionTypes?: TransactionType[];
  
  /** Filter by multiple statuses */
  statuses?: PaymentStatus[];
}