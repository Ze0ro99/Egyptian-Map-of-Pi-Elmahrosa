/**
 * @fileoverview Enhanced payments controller for Egyptian Map of Pi marketplace
 * Implements secure payment processing with Egyptian market-specific validations
 * @version 1.0.0
 */

import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Param, 
  UseGuards,
  HttpException,
  HttpStatus
} from '@nestjs/common'; // v10.0.0
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiHeader 
} from '@nestjs/swagger'; // v7.1.0
import { Logger } from 'winston'; // v3.10.0
import moment from 'moment-timezone'; // v0.5.43

import { IPayment, PaymentStatus } from '../interfaces/payment.interface';
import { PiPaymentService } from '../services/pi-payment.service';
import { TransactionService } from '../services/transaction.service';

/**
 * Interface for payment initialization request
 */
interface InitializePaymentDto {
  amount: number;
  buyerId: string;
  sellerId: string;
  listingId: string;
}

/**
 * Interface for payment processing request
 */
interface ProcessPaymentDto {
  piTransactionId: string;
}

/**
 * Enhanced payments controller with Egyptian market validation
 */
@Controller('payments')
@ApiTags('payments')
@UseGuards(AuthGuard)
export class PaymentsController {
  private readonly logger: Logger;
  private readonly egyptianBusinessHours = {
    start: 9, // 9 AM Cairo time
    end: 22, // 10 PM Cairo time
    timezone: 'Africa/Cairo'
  };

  constructor(
    private readonly piPaymentService: PiPaymentService,
    private readonly transactionService: TransactionService
  ) {
    // Initialize logger with Arabic support
    this.logger = new Logger({
      level: 'info',
      format: Logger.format.json(),
      defaultMeta: { service: 'payments-controller' },
      transports: [
        new Logger.transports.File({ filename: 'payments-error.log', level: 'error' }),
        new Logger.transports.File({ filename: 'payments-combined.log' })
      ]
    });
  }

  /**
   * Initializes a new payment with Egyptian market validation
   * @param paymentData Payment initialization data
   * @returns Promise<IPayment>
   */
  @Post('initialize')
  @ApiOperation({ summary: 'Initialize a new payment with Egyptian market validation' })
  @ApiResponse({ status: 201, description: 'Payment initialized successfully' })
  @ApiResponse({ status: 400, description: 'Invalid payment data or outside business hours' })
  async initializePayment(@Body() paymentData: InitializePaymentDto): Promise<IPayment> {
    try {
      // Validate Egyptian business hours
      const isValidBusinessHour = await this.validateBusinessHours();
      if (!isValidBusinessHour) {
        throw new HttpException(
          'Payments can only be initialized during Egyptian business hours (9 AM - 10 PM Cairo time)',
          HttpStatus.BAD_REQUEST
        );
      }

      // Initialize payment through Pi Network
      const payment = await this.piPaymentService.initializePayment(
        paymentData.amount,
        paymentData.buyerId,
        paymentData.listingId
      );

      // Create transaction record with Egyptian market data
      await this.transactionService.createTransaction(
        {
          ...payment,
          sellerId: paymentData.sellerId,
          metadata: {
            regulatoryCategory: this.determineRegulatoryCategory(paymentData.amount),
            notes: 'Transaction initiated in Egyptian marketplace',
            businessHoursCompliant: true
          }
        },
        {
          location: 'Egypt',
          timezone: this.egyptianBusinessHours.timezone
        }
      );

      this.logger.info('Payment initialized successfully', {
        paymentId: payment.id,
        amount: payment.amount,
        buyerId: payment.buyerId
      });

      return payment;
    } catch (error) {
      this.logger.error('Payment initialization failed', {
        error,
        paymentData
      });
      throw error;
    }
  }

  /**
   * Processes a payment with Egyptian market security checks
   * @param id Payment identifier
   * @param processData Payment processing data
   * @returns Promise<IPayment>
   */
  @Post(':id/process')
  @ApiOperation({ summary: 'Process a payment with Egyptian market validation' })
  @ApiResponse({ status: 200, description: 'Payment processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid payment data or outside business hours' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async processPayment(
    @Param('id') id: string,
    @Body() processData: ProcessPaymentDto
  ): Promise<IPayment> {
    try {
      // Validate business hours
      const isValidBusinessHour = await this.validateBusinessHours();
      if (!isValidBusinessHour) {
        throw new HttpException(
          'Payments can only be processed during Egyptian business hours (9 AM - 10 PM Cairo time)',
          HttpStatus.BAD_REQUEST
        );
      }

      // Process payment through Pi Network
      const payment = await this.piPaymentService.processPayment(
        id,
        processData.piTransactionId
      );

      // Update transaction with processing status
      await this.transactionService.processEgyptianMarketTransaction(
        payment.id,
        {
          location: 'Egypt',
          timezone: this.egyptianBusinessHours.timezone
        }
      );

      this.logger.info('Payment processed successfully', {
        paymentId: payment.id,
        piTransactionId: processData.piTransactionId
      });

      return payment;
    } catch (error) {
      this.logger.error('Payment processing failed', {
        error,
        paymentId: id,
        processData
      });
      throw error;
    }
  }

  /**
   * Retrieves user payment history with filtering
   * @param userId User identifier
   * @returns Promise<IPayment[]>
   */
  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user payment history' })
  @ApiResponse({ status: 200, description: 'Payment history retrieved successfully' })
  async getUserPayments(@Param('userId') userId: string): Promise<IPayment[]> {
    try {
      const transactions = await this.transactionService.getUserTransactions(
        userId,
        { isActive: true }
      );

      return transactions.map(tx => ({
        id: tx.paymentId,
        amount: tx.amount,
        status: tx.status as PaymentStatus,
        buyerId: tx.buyerId,
        sellerId: tx.sellerId,
        listingId: tx.listingId,
        escrowId: tx.escrowId,
        piPaymentId: tx.metadata.piTxId,
        completedAt: tx.metadata.piConfirmationTime
      }));
    } catch (error) {
      this.logger.error('Failed to retrieve user payments', {
        error,
        userId
      });
      throw error;
    }
  }

  /**
   * Validates if current time is within Egyptian business hours
   * @returns Promise<boolean>
   */
  private async validateBusinessHours(): Promise<boolean> {
    const cairoTime = moment().tz(this.egyptianBusinessHours.timezone);
    const currentHour = cairoTime.hour();
    
    // Check if within business hours
    if (currentHour < this.egyptianBusinessHours.start || 
        currentHour >= this.egyptianBusinessHours.end) {
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
   * Determines regulatory category based on payment amount
   * @param amount Payment amount
   * @returns string
   */
  private determineRegulatoryCategory(amount: number): string {
    if (amount >= 10000) return 'HIGH_VALUE';
    if (amount >= 5000) return 'MEDIUM_VALUE';
    return 'STANDARD';
  }
}