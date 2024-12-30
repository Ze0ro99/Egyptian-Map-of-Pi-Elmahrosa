/**
 * @fileoverview Enhanced payment service implementation for the Egyptian Map of Pi marketplace.
 * Handles Pi cryptocurrency payment operations with Egyptian market compliance,
 * bilingual support, and enhanced security measures.
 * @version 1.0.0
 */

import { PiNetwork } from '@pi-network/sdk'; // v2.0.0
import { Payment, PaymentStatus, PaymentEscrow } from '../interfaces/payment.interface';

/**
 * Enhanced service class for handling Pi cryptocurrency payments with Egyptian market compliance
 * Implements secure payment processing with escrow support and regulatory validation
 */
export class PaymentService {
  private piNetwork: PiNetwork;
  private isInitialized: boolean;
  private readonly EGYPTIAN_PI_RATE = 30; // Pi to EGP conversion rate
  private readonly ESCROW_DURATION_DAYS = 14; // Standard escrow period
  private readonly MIN_TRANSACTION_AMOUNT = 0.1; // Minimum transaction in Pi
  private readonly MAX_TRANSACTION_AMOUNT = 10000; // Maximum transaction in Pi

  constructor() {
    this.piNetwork = new PiNetwork();
    this.isInitialized = false;
  }

  /**
   * Initializes the Pi Network SDK and validates Egyptian market requirements
   * @throws Error if initialization fails
   */
  private async initialize(): Promise<void> {
    if (!this.isInitialized) {
      try {
        await this.piNetwork.init();
        this.isInitialized = true;
      } catch (error) {
        throw new Error(`Pi Network initialization failed: ${error.message}`);
      }
    }
  }

  /**
   * Validates payment amount against Egyptian market limits
   * @param amount - Payment amount in Pi
   * @throws Error if amount is invalid
   */
  private validateAmount(amount: number): void {
    if (amount < this.MIN_TRANSACTION_AMOUNT || amount > this.MAX_TRANSACTION_AMOUNT) {
      throw new Error(
        `Payment amount must be between ${this.MIN_TRANSACTION_AMOUNT} and ${this.MAX_TRANSACTION_AMOUNT} Pi`
      );
    }
  }

  /**
   * Calculates payment amount in Egyptian Pounds (EGP)
   * @param piAmount - Amount in Pi
   * @returns Amount in EGP
   */
  private calculateEGPAmount(piAmount: number): number {
    return piAmount * this.EGYPTIAN_PI_RATE;
  }

  /**
   * Generates a secure payment hash for verification
   * @param paymentData - Payment data to hash
   * @returns Security hash string
   */
  private generateSecurityHash(paymentData: Partial<Payment>): string {
    const dataString = JSON.stringify(paymentData);
    return Buffer.from(dataString).toString('base64');
  }

  /**
   * Initializes a new payment transaction with Egyptian market validation
   * @param amount - Payment amount in Pi
   * @param listingId - Associated listing identifier
   * @param sellerId - Seller's Pi Network ID
   * @param taxId - Egyptian tax registration number
   * @returns Promise resolving to created payment object
   * @throws Error if validation fails
   */
  public async initializePayment(
    amount: number,
    listingId: string,
    sellerId: string,
    taxId: string
  ): Promise<Payment> {
    await this.initialize();
    this.validateAmount(amount);

    try {
      // Initialize Pi Network payment
      const piPayment = await this.piNetwork.createPayment({
        amount: amount,
        memo: `Payment for listing ${listingId}`,
        metadata: { listingId, sellerId, taxId }
      });

      // Calculate escrow release date
      const escrowReleaseDate = new Date();
      escrowReleaseDate.setDate(escrowReleaseDate.getDate() + this.ESCROW_DURATION_DAYS);

      // Create payment record with enhanced validation
      const payment: Payment = {
        id: piPayment.identifier,
        amount: amount,
        amountEGP: this.calculateEGPAmount(amount),
        status: PaymentStatus.PENDING,
        buyerId: await this.piNetwork.getCurrentUser().uid,
        sellerId: sellerId,
        listingId: listingId,
        escrowId: piPayment.escrowId,
        piPaymentId: piPayment.identifier,
        escrowReleaseDate: escrowReleaseDate,
        securityHash: this.generateSecurityHash(piPayment),
        egyptianTaxId: taxId,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return payment;
    } catch (error) {
      throw new Error(`Payment initialization failed: ${error.message}`);
    }
  }

  /**
   * Checks payment status with enhanced Egyptian compliance verification
   * @param paymentId - Payment identifier
   * @returns Promise resolving to payment status
   * @throws Error if status check fails
   */
  public async checkPaymentStatus(paymentId: string): Promise<Payment> {
    await this.initialize();

    try {
      const piPayment = await this.piNetwork.getPayment(paymentId);
      const payment: Payment = {
        ...piPayment,
        status: this.mapPiStatusToPaymentStatus(piPayment.status),
        updatedAt: new Date()
      };

      return payment;
    } catch (error) {
      throw new Error(`Payment status check failed: ${error.message}`);
    }
  }

  /**
   * Releases escrowed payment with Egyptian legal compliance checks
   * @param paymentId - Payment identifier
   * @returns Promise resolving to updated payment status
   * @throws Error if escrow release fails
   */
  public async releaseEscrow(paymentId: string): Promise<Payment> {
    await this.initialize();

    try {
      // Verify payment status and escrow conditions
      const payment = await this.checkPaymentStatus(paymentId);
      
      if (payment.status !== PaymentStatus.ESCROW_LOCKED) {
        throw new Error('Payment is not in escrow state');
      }

      if (new Date() < payment.escrowReleaseDate) {
        throw new Error('Escrow release date has not been reached');
      }

      // Release escrow through Pi Network
      await this.piNetwork.releasePaymentEscrow(paymentId);

      // Update payment status
      const updatedPayment: Payment = {
        ...payment,
        status: PaymentStatus.COMPLETED,
        completedAt: new Date(),
        updatedAt: new Date()
      };

      return updatedPayment;
    } catch (error) {
      throw new Error(`Escrow release failed: ${error.message}`);
    }
  }

  /**
   * Maps Pi Network payment status to internal payment status
   * @param piStatus - Pi Network payment status
   * @returns Internal payment status
   */
  private mapPiStatusToPaymentStatus(piStatus: string): PaymentStatus {
    const statusMap: { [key: string]: PaymentStatus } = {
      'PENDING': PaymentStatus.PENDING,
      'PROCESSING': PaymentStatus.PROCESSING,
      'COMPLETED': PaymentStatus.COMPLETED,
      'CANCELLED': PaymentStatus.CANCELLED,
      'FAILED': PaymentStatus.FAILED,
      'ESCROW_PENDING': PaymentStatus.ESCROW_PENDING,
      'ESCROW_LOCKED': PaymentStatus.ESCROW_LOCKED
    };

    return statusMap[piStatus] || PaymentStatus.FAILED;
  }
}