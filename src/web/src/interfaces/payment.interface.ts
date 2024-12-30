/**
 * @fileoverview Defines TypeScript interfaces for payment processing in the Egyptian Map of Pi.
 * Implements secure payment data structures with Egyptian market-specific requirements,
 * escrow management, and Pi Network integration.
 * @version 1.0.0
 */

import { User } from './user.interface';

/**
 * Enhanced payment status enumeration including escrow and dispute states
 * Implements comprehensive transaction lifecycle tracking
 */
export enum PaymentStatus {
  /** Initial payment state */
  PENDING = 'PENDING',
  
  /** Payment is being processed by Pi Network */
  PROCESSING = 'PROCESSING',
  
  /** Payment is pending escrow confirmation */
  ESCROW_PENDING = 'ESCROW_PENDING',
  
  /** Funds are locked in escrow */
  ESCROW_LOCKED = 'ESCROW_LOCKED',
  
  /** Payment is under dispute resolution */
  DISPUTE_RESOLUTION = 'DISPUTE_RESOLUTION',
  
  /** Payment successfully completed */
  COMPLETED = 'COMPLETED',
  
  /** Payment failed to process */
  FAILED = 'FAILED',
  
  /** Payment was refunded */
  REFUNDED = 'REFUNDED',
  
  /** Payment was cancelled */
  CANCELLED = 'CANCELLED'
}

/**
 * Comprehensive payment interface with Egyptian market specifics
 * Implements secure payment processing with escrow support
 */
export interface Payment {
  /** Unique payment identifier */
  id: string;

  /** Payment amount in Pi */
  amount: number;

  /** Payment amount in Egyptian Pounds (EGP) */
  amountEGP: number;

  /** Current payment status */
  status: PaymentStatus;

  /** Pi Network ID of the buyer */
  buyerId: string;

  /** Pi Network ID of the seller */
  sellerId: string;

  /** Associated listing identifier */
  listingId: string;

  /** Escrow service identifier */
  escrowId: string;

  /** Pi Network payment transaction ID */
  piPaymentId: string;

  /** Scheduled date for escrow release */
  escrowReleaseDate: Date;

  /** Reason for dispute if applicable */
  disputeReason?: string;

  /** Payment security verification hash */
  securityHash: string;

  /** Egyptian tax registration number if applicable */
  egyptianTaxId?: string;

  /** Egyptian merchant verification ID if applicable */
  merchantVerificationId?: string;

  /** Timestamp of payment completion */
  completedAt: Date | null;

  /** Payment creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Enhanced interface for payment escrow management with Egyptian market requirements
 * Implements secure escrow service integration
 */
export interface PaymentEscrow {
  /** Associated payment identifier */
  paymentId: string;

  /** Amount held in escrow */
  amount: number;

  /** Type of escrow service */
  escrowType: string;

  /** Egyptian legal reference number */
  egyptianLegalReference: string;

  /** Scheduled release date */
  releaseDate: Date;

  /** Escrow release status */
  isReleased: boolean;

  /** Verification status */
  verificationStatus: boolean;

  /** Identity of party who released escrow */
  releasedBy: string;

  /** Timestamp of escrow release */
  releasedAt: Date;

  /** Required conditions for escrow release */
  releaseConditions: string[];
}

/**
 * Enhanced interface for payment filtering with Egyptian market specifics
 * Supports comprehensive payment search and filtering
 */
export interface PaymentFilter {
  /** Filter by buyer ID */
  buyerId: string;

  /** Filter by seller ID */
  sellerId: string;

  /** Filter by payment status */
  status: PaymentStatus;

  /** Filter by Egyptian governorate */
  governorate: string;

  /** Filter by merchant category */
  merchantCategory: string;

  /** Filter by verification level */
  verificationLevel: string;

  /** Filter by start date */
  startDate: Date;

  /** Filter by end date */
  endDate: Date;

  /** Filter by minimum amount */
  minAmount: number;

  /** Filter by maximum amount */
  maxAmount: number;
}

/**
 * Type guard to check if a value is a valid PaymentStatus
 * @param value - Value to check
 * @returns boolean indicating if value is a valid PaymentStatus
 */
export function isPaymentStatus(value: any): value is PaymentStatus {
  return Object.values(PaymentStatus).includes(value as PaymentStatus);
}

/**
 * Type for payment update operations
 * Ensures partial updates maintain data integrity
 */
export type PaymentUpdate = Partial<Omit<Payment, 'id' | 'piPaymentId' | 'createdAt' | 'securityHash'>>;

/**
 * Type for escrow update operations
 * Ensures partial updates maintain security requirements
 */
export type EscrowUpdate = Partial<Omit<PaymentEscrow, 'paymentId' | 'escrowType' | 'egyptianLegalReference'>>;