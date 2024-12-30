/**
 * @fileoverview Enhanced transaction controller for Egyptian Map of Pi marketplace
 * Implements secure transaction processing with Egyptian market-specific validations
 * @version 1.0.0
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common'; // v10.0.0
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger'; // v7.0.0

import {
  ITransaction,
  TransactionType,
  ITransactionFilter,
  ITransactionMetadata,
} from '../interfaces/transaction.interface';
import { TransactionService } from '../services/transaction.service';
import { AuthGuard } from '../../../shared/guards/auth.guard';
import { EgyptianMarketGuard } from '../guards/egyptian-market.guard';

/**
 * Enhanced controller for managing Pi payment transactions with Egyptian market features
 */
@Controller('transactions')
@ApiTags('transactions')
@UseGuards(AuthGuard, EgyptianMarketGuard)
@ApiSecurity('egyptian-market')
export class TransactionsController {
  constructor(private readonly transactionService: TransactionService) {}

  /**
   * Creates a new transaction with Egyptian market validation
   */
  @Post()
  @ApiOperation({ summary: 'Create new transaction with Egyptian market validation' })
  @ApiBody({ type: Object, description: 'Transaction data with Egyptian market metadata' })
  @ApiResponse({ status: 201, description: 'Transaction created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or outside business hours' })
  @ApiResponse({ status: 403, description: 'Transaction limits exceeded' })
  async createTransaction(@Body() transactionData: ITransaction): Promise<ITransaction> {
    try {
      const transaction = await this.transactionService.createTransaction(
        transactionData,
        { location: 'Egypt', timezone: 'Africa/Cairo' }
      );
      return transaction;
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: error.message,
          details: {
            ar: 'فشل في إنشاء المعاملة',
            en: 'Failed to create transaction'
          }
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Retrieves transaction by ID with enhanced security checks
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID with security validation' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransactionById(@Param('id') id: string): Promise<ITransaction> {
    try {
      const transaction = await this.transactionService.getTransactionById(id);
      if (!transaction) {
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: 'Transaction not found',
            details: {
              ar: 'لم يتم العثور على المعاملة',
              en: 'Transaction not found'
            }
          },
          HttpStatus.NOT_FOUND
        );
      }
      return transaction;
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: error.message,
          details: {
            ar: 'خطأ في استرجاع المعاملة',
            en: 'Error retrieving transaction'
          }
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Retrieves user transactions with enhanced filtering
   */
  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user transactions with filtering' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  async getUserTransactions(
    @Param('userId') userId: string,
    @Query() filter: ITransactionFilter
  ): Promise<ITransaction[]> {
    try {
      return await this.transactionService.getUserTransactions(userId, filter);
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: error.message,
          details: {
            ar: 'خطأ في استرجاع معاملات المستخدم',
            en: 'Error retrieving user transactions'
          }
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Updates transaction status with Egyptian market validation
   */
  @Put(':id/status')
  @ApiOperation({ summary: 'Update transaction status with market validation' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status update' })
  async updateTransactionStatus(
    @Param('id') id: string,
    @Body() updateData: { status: string }
  ): Promise<ITransaction> {
    try {
      const transaction = await this.transactionService.processEgyptianMarketTransaction(
        id,
        { location: 'Egypt', timezone: 'Africa/Cairo' }
      );
      return transaction;
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: error.message,
          details: {
            ar: 'فشل في تحديث حالة المعاملة',
            en: 'Failed to update transaction status'
          }
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Retrieves transactions for a specific listing
   */
  @Get('listing/:listingId')
  @ApiOperation({ summary: 'Get transactions for a specific listing' })
  @ApiParam({ name: 'listingId', description: 'Listing ID' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  async getListingTransactions(
    @Param('listingId') listingId: string,
    @Query() filter: ITransactionFilter
  ): Promise<ITransaction[]> {
    try {
      return await this.transactionService.getListingTransactions(listingId, filter);
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: error.message,
          details: {
            ar: 'خطأ في استرجاع معاملات القائمة',
            en: 'Error retrieving listing transactions'
          }
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}