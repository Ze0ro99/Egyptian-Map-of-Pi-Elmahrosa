/**
 * @fileoverview Enhanced transaction service implementation for Egyptian Map of Pi marketplace
 * Handles secure transaction processing with Egyptian market-specific adaptations
 * @version 1.0.0
 */

import { Injectable } from '@nestjs/common'; // v10.0.0
import { Logger } from 'winston'; // v3.10.0
import * as crypto from 'crypto'; // latest
import moment from 'moment-timezone'; // v0.5.43

import {
  ITransaction,
  TransactionType,
  ITransactionFilter,
  ITransactionMetadata,
  IEgyptianMarketData
} from '../interfaces/transaction.interface';
import { Transaction } from '../models/transaction.model';
import { PiPaymentService } from './pi-payment.service';
import { EscrowService } from './escrow.service';

@Injectable()
export class TransactionService {
  private readonly logger: Logger;
  private readonly encryptionKey: Buffer;
  private readonly egyptianBusinessHours = {
    start: 9, // 9 AM Cairo time
    end: 22, // 10 PM Cairo time
    timezone: 'Africa/Cairo'
  };

  constructor(
    private readonly transactionModel: typeof Transaction,
    private readonly piPaymentService: PiPaymentService,
    private readonly escrowService: EscrowService
  ) {
    // Initialize logger with enhanced security logging
    this.logger = new Logger({
      level: 'info',
      format: Logger.format.json(),
      defaultMeta: { service: 'transaction-service' },
      transports: [
        new Logger.transports.File({ filename: 'transaction-error.log', level: 'error' }),
        new Logger.transports.File({ filename: 'transaction-combined.log' })
      ]
    });

    // Initialize encryption key for sensitive data
    this.encryptionKey = Buffer.from(process.env.TRANSACTION_ENCRYPTION_KEY || '', 'hex');
  }

  /**
   * Creates a new transaction with Egyptian market validation
   * @param transactionData Transaction details
   * @param marketData Egyptian market-specific data
   * @returns Promise<ITransaction>
   */
  async createTransaction(
    transactionData: ITransaction,
    marketData: IEgyptianMarketData
  ): Promise<ITransaction> {
    try {
      // Validate Egyptian business hours
      const isValidBusinessHour = await this.validateEgyptianBusinessHours(new Date());
      if (!isValidBusinessHour) {
        throw new Error('Transactions can only be processed during Egyptian business hours');
      }

      // Encrypt sensitive transaction data
      const encryptedData = this.encryptSensitiveData({
        buyerId: transactionData.buyerId,
        sellerId: transactionData.sellerId,
        amount: transactionData.amount
      });

      // Create transaction metadata
      const metadata: ITransactionMetadata = {
        piTxId: '',
        piBlockId: '',
        piBlockHeight: 0,
        piConfirmationTime: null,
        escrowContractId: '',
        escrowReleaseTime: null,
        regulatoryCategory: this.determineRegulatoryCategory(transactionData.amount),
        notes: `Transaction processed in Egyptian market - ${marketData.location}`,
        auditTrail: [{
          timestamp: new Date(),
          action: 'CREATED',
          userId: transactionData.buyerId,
          reason: 'Transaction initiated'
        }],
        isArchived: false,
        archivalDate: null
      };

      // Create and save transaction
      const transaction = await this.transactionModel.create({
        ...transactionData,
        metadata,
        encryptedData,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      });

      // Initialize escrow if required
      if (this.requiresEscrow(transaction.amount)) {
        const escrow = await this.escrowService.createEscrow({
          paymentId: transaction.id,
          amount: transaction.amount,
          buyerId: transaction.buyerId,
          sellerId: transaction.sellerId
        });
        transaction.escrowId = escrow.id;
      }

      // Process payment through Pi Network
      const payment = await this.piPaymentService.processPayment(
        transaction.id,
        transaction.amount,
        transaction.buyerId,
        transaction.sellerId
      );

      // Update transaction with payment details
      transaction.metadata.piTxId = payment.piPaymentId;
      await transaction.save();

      this.logger.info('Transaction created successfully', {
        transactionId: transaction.id,
        amount: transaction.amount,
        type: transaction.type
      });

      return transaction;
    } catch (error) {
      this.logger.error('Transaction creation failed', {
        error,
        transactionData
      });
      throw error;
    }
  }

  /**
   * Retrieves transaction by ID with security checks
   * @param transactionId Transaction identifier
   * @returns Promise<ITransaction>
   */
  async getTransactionById(transactionId: string): Promise<ITransaction> {
    const transaction = await this.transactionModel.findById(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Decrypt sensitive data before returning
    const decryptedData = this.decryptSensitiveData(transaction.encryptedData);
    return {
      ...transaction.toObject(),
      ...decryptedData
    };
  }

  /**
   * Retrieves user transactions with filtering
   * @param userId User identifier
   * @param filter Transaction filter criteria
   * @returns Promise<ITransaction[]>
   */
  async getUserTransactions(
    userId: string,
    filter: ITransactionFilter
  ): Promise<ITransaction[]> {
    const transactions = await this.transactionModel.find({
      $or: [{ buyerId: userId }, { sellerId: userId }],
      ...filter,
      isActive: true
    }).sort({ createdAt: -1 });

    return transactions.map(transaction => ({
      ...transaction.toObject(),
      ...this.decryptSensitiveData(transaction.encryptedData)
    }));
  }

  /**
   * Validates transaction timing against Egyptian business hours
   * @param transactionTime Transaction timestamp
   * @returns Promise<boolean>
   */
  private async validateEgyptianBusinessHours(transactionTime: Date): Promise<boolean> {
    const cairoTime = moment(transactionTime).tz(this.egyptianBusinessHours.timezone);
    const hour = cairoTime.hour();
    
    // Check if within business hours
    if (hour < this.egyptianBusinessHours.start || hour >= this.egyptianBusinessHours.end) {
      return false;
    }

    // Check if weekend (Friday or Saturday in Egypt)
    const dayOfWeek = cairoTime.day();
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      return false;
    }

    return true;
  }

  /**
   * Determines regulatory category based on transaction amount
   * @param amount Transaction amount
   * @returns string
   */
  private determineRegulatoryCategory(amount: number): string {
    if (amount >= 10000) return 'HIGH_VALUE';
    if (amount >= 5000) return 'MEDIUM_VALUE';
    return 'STANDARD';
  }

  /**
   * Encrypts sensitive transaction data
   * @param data Sensitive data object
   * @returns string
   */
  private encryptSensitiveData(data: any): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(data), 'utf8'),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  /**
   * Decrypts sensitive transaction data
   * @param encryptedData Encrypted data string
   * @returns any
   */
  private decryptSensitiveData(encryptedData: string): any {
    const buffer = Buffer.from(encryptedData, 'base64');
    const iv = buffer.slice(0, 16);
    const authTag = buffer.slice(16, 32);
    const encrypted = buffer.slice(32);

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return JSON.parse(decrypted.toString('utf8'));
  }

  /**
   * Determines if transaction requires escrow based on amount
   * @param amount Transaction amount
   * @returns boolean
   */
  private requiresEscrow(amount: number): boolean {
    return amount >= 1000; // Escrow required for transactions >= 1000 Pi
  }

  /**
   * Processes transaction with Egyptian market rules
   * @param transactionId Transaction identifier
   * @param marketData Egyptian market data
   * @returns Promise<ITransaction>
   */
  async processEgyptianMarketTransaction(
    transactionId: string,
    marketData: IEgyptianMarketData
  ): Promise<ITransaction> {
    const transaction = await this.getTransactionById(transactionId);

    // Validate business hours
    const isValidHour = await this.validateEgyptianBusinessHours(new Date());
    if (!isValidHour) {
      throw new Error('Transaction processing not allowed outside business hours');
    }

    // Update transaction with market data
    transaction.metadata.notes += `\nProcessed in ${marketData.location}`;
    transaction.metadata.auditTrail.push({
      timestamp: new Date(),
      action: 'MARKET_PROCESSED',
      userId: transaction.buyerId,
      reason: 'Egyptian market processing'
    });

    await transaction.save();

    this.logger.info('Egyptian market transaction processed', {
      transactionId,
      location: marketData.location
    });

    return transaction;
  }
}