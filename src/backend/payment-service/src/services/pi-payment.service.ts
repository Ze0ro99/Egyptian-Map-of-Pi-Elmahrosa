/**
 * @fileoverview Enhanced Pi Network payment service implementation for Egyptian Map of Pi marketplace
 * Implements secure payment processing, escrow operations, and Egyptian market-specific validations
 * @version 1.0.0
 */

import axios from 'axios'; // v1.5.0
import { PiNetwork } from '@pinetwork-js/sdk'; // v2.0.0
import { createLogger } from 'winston'; // v3.10.0
import moment from 'moment-timezone'; // v0.5.43

import { IPayment, PaymentStatus } from '../interfaces/payment.interface';
import { Payment } from '../models/payment.model';
import { piPaymentConfig, PiPaymentConfig } from '../config/pi-payment.config';

/**
 * Enhanced service class for managing Pi Network payment operations with Egyptian market adaptations
 */
export class PiPaymentService {
  private readonly logger = createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
      new winston.transports.File({ filename: 'payment-service-error.log', level: 'error' }),
      new winston.transports.File({ filename: 'payment-service-combined.log' })
    ]
  });

  private readonly piNetwork: PiNetwork;
  private readonly axiosInstance = axios.create({
    baseURL: piPaymentConfig.apiEndpoint,
    headers: {
      'Authorization': `Bearer ${piPaymentConfig.apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  constructor(
    private readonly paymentModel: typeof Payment,
    private readonly config: PiPaymentConfig
  ) {
    this.piNetwork = new PiNetwork({
      apiKey: config.apiKey,
      sandboxMode: config.sandboxMode
    });

    // Configure axios interceptors for enhanced security
    this.setupAxiosInterceptors();
  }

  /**
   * Initializes a new payment transaction with Egyptian market validations
   * @param amount Payment amount in Pi
   * @param buyerId Buyer's Pi Network ID
   * @param listingId Associated listing ID
   * @returns Promise<IPayment>
   */
  async initializePayment(
    amount: number,
    buyerId: string,
    listingId: string
  ): Promise<IPayment> {
    try {
      // Validate payment amount against Egyptian market rules
      await this.validatePaymentAmount(amount);

      // Check Egyptian business hours compliance
      const isWithinBusinessHours = await this.validateBusinessHours();
      if (!isWithinBusinessHours) {
        throw new Error('Transaction can only be processed during Egyptian business hours');
      }

      // Calculate EGP equivalent
      const egpEquivalent = await this.calculateEgpEquivalent(amount);

      // Create initial payment record
      const payment = await this.paymentModel.create({
        amount,
        buyerId,
        listingId,
        status: PaymentStatus.PENDING,
        egpEquivalent,
        businessHoursCompliant: true
      });

      // Initialize Pi Network payment
      const piPayment = await this.piNetwork.createPayment({
        amount,
        memo: `Payment for listing ${listingId}`,
        metadata: {
          paymentId: payment.id,
          egpEquivalent,
          marketplaceId: 'egyptian-map-of-pi'
        }
      });

      // Update payment with Pi Network payment ID
      await this.paymentModel.updatePaymentStatus(payment.id, {
        piPaymentId: piPayment.identifier,
        status: PaymentStatus.PROCESSING
      });

      this.logger.info('Payment initialized', {
        paymentId: payment.id,
        amount,
        buyerId,
        listingId
      });

      return payment;
    } catch (error) {
      this.logger.error('Payment initialization failed', {
        error,
        amount,
        buyerId,
        listingId
      });
      throw error;
    }
  }

  /**
   * Processes payment with enhanced security and Egyptian market rules
   * @param paymentId Payment ID
   * @param piTransactionId Pi Network transaction ID
   * @returns Promise<IPayment>
   */
  async processPayment(
    paymentId: string,
    piTransactionId: string
  ): Promise<IPayment> {
    try {
      // Retrieve and validate payment
      const payment = await this.paymentModel.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      // Verify Pi Network transaction
      const piTransaction = await this.piNetwork.getTransaction(piTransactionId);
      if (!piTransaction) {
        throw new Error('Pi Network transaction not found');
      }

      // Validate transaction amount
      if (piTransaction.amount !== payment.amount) {
        throw new Error('Transaction amount mismatch');
      }

      // Apply Egyptian market escrow rules
      await this.handleEscrowOperations(payment);

      // Update payment status
      const updatedPayment = await this.paymentModel.updatePaymentStatus(
        paymentId,
        PaymentStatus.COMPLETED
      );

      this.logger.info('Payment processed successfully', {
        paymentId,
        piTransactionId
      });

      return updatedPayment;
    } catch (error) {
      this.logger.error('Payment processing failed', {
        error,
        paymentId,
        piTransactionId
      });
      throw error;
    }
  }

  /**
   * Validates payment amount against Egyptian market rules
   * @param amount Payment amount
   * @returns Promise<boolean>
   */
  private async validatePaymentAmount(amount: number): Promise<boolean> {
    const {
      minAmount,
      maxAmount,
      dailyLimit
    } = this.config.transactionLimits;

    if (amount < minAmount || amount > maxAmount) {
      throw new Error(`Payment amount must be between ${minAmount} and ${maxAmount} Pi`);
    }

    // Check daily transaction limit
    const dailyTransactions = await this.paymentModel.findByBuyerId(
      moment().startOf('day').toDate(),
      moment().endOf('day').toDate()
    );

    const dailyTotal = dailyTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    if (dailyTotal + amount > dailyLimit) {
      throw new Error('Daily transaction limit exceeded');
    }

    return true;
  }

  /**
   * Validates transaction timing against Egyptian business hours
   * @returns Promise<boolean>
   */
  private async validateBusinessHours(): Promise<boolean> {
    const cairoTime = moment().tz('Africa/Cairo');
    const { start, end } = this.config.egyptianMarketConfig.businessHours;

    const hour = cairoTime.hour();
    return hour >= start && hour < end;
  }

  /**
   * Handles escrow operations for Egyptian market
   * @param payment Payment object
   * @returns Promise<void>
   */
  private async handleEscrowOperations(payment: IPayment): Promise<void> {
    const escrowDuration = this.config.escrowSettings.defaultDurationDays;
    const releaseDate = moment().add(escrowDuration, 'days');

    await this.paymentModel.updateOne(
      { _id: payment.id },
      {
        $set: {
          escrowReleaseDate: releaseDate.toDate(),
          escrowStatus: 'HELD'
        }
      }
    );
  }

  /**
   * Configures axios interceptors for enhanced security
   */
  private setupAxiosInterceptors(): void {
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Add security headers
        config.headers['X-Transaction-ID'] = `pi-${Date.now()}`;
        config.headers['X-Market-Region'] = 'EG';
        return config;
      },
      (error) => {
        this.logger.error('Request interceptor error', { error });
        return Promise.reject(error);
      }
    );

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logger.error('Response interceptor error', { error });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Calculates EGP equivalent of Pi amount
   * @param piAmount Amount in Pi
   * @returns Promise<number>
   */
  private async calculateEgpEquivalent(piAmount: number): Promise<number> {
    // Implementation would integrate with Egyptian Central Bank API
    // For now, using a placeholder conversion rate
    const conversionRate = 30; // 1 Pi = 30 EGP
    return piAmount * conversionRate;
  }
}