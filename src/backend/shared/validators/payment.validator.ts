/**
 * @fileoverview Payment validation implementation for Egyptian Map of Pi marketplace
 * @version 1.0.0
 * 
 * Implements comprehensive validation rules for payment operations with specific
 * focus on Egyptian market requirements, bilingual support, and Pi Network compliance.
 */

import { IsNotEmpty, IsNumber, IsEnum, IsString, Min, Max, IsOptional } from 'class-validator'; // v0.14.0
import { validateInput, validatePiAmount } from '../utils/validation.util';
import { PaymentStatus, PaymentType } from '../../payment-service/src/interfaces/payment.interface';
import { ErrorResponse } from '../interfaces/response.interface';

/**
 * Maximum transaction limits for Egyptian market (in Pi)
 */
const EGYPT_MARKET_LIMITS = {
  MIN_TRANSACTION: 0.1,
  MAX_TRANSACTION: 1000000, // 1 million Pi
  MIN_ESCROW_AMOUNT: 1.0, // Minimum amount for escrow payments
  MAX_MEMO_LENGTH: 500 // Maximum length for payment memo
};

/**
 * Validator class for incoming payment requests with Egyptian market-specific rules
 */
export class PaymentRequestValidator {
  @IsNumber({}, {
    message: {
      en: 'Amount must be a valid number',
      ar: 'يجب أن يكون المبلغ رقمًا صحيحًا'
    }
  })
  @Min(EGYPT_MARKET_LIMITS.MIN_TRANSACTION, {
    message: {
      en: `Minimum transaction amount is ${EGYPT_MARKET_LIMITS.MIN_TRANSACTION} Pi`,
      ar: `الحد الأدنى للمعاملة هو ${EGYPT_MARKET_LIMITS.MIN_TRANSACTION} باي`
    }
  })
  @Max(EGYPT_MARKET_LIMITS.MAX_TRANSACTION, {
    message: {
      en: `Maximum transaction amount is ${EGYPT_MARKET_LIMITS.MAX_TRANSACTION} Pi`,
      ar: `الحد الأقصى للمعاملة هو ${EGYPT_MARKET_LIMITS.MAX_TRANSACTION} باي`
    }
  })
  amount: number;

  @IsNotEmpty({
    message: {
      en: 'Seller ID is required',
      ar: 'معرف البائع مطلوب'
    }
  })
  @IsString()
  sellerId: string;

  @IsNotEmpty({
    message: {
      en: 'Buyer ID is required',
      ar: 'معرف المشتري مطلوب'
    }
  })
  @IsString()
  buyerId: string;

  @IsNotEmpty({
    message: {
      en: 'Listing ID is required',
      ar: 'معرف المنتج مطلوب'
    }
  })
  @IsString()
  listingId: string;

  @IsEnum(PaymentType, {
    message: {
      en: 'Invalid payment type',
      ar: 'نوع الدفع غير صالح'
    }
  })
  type: PaymentType;

  @IsOptional()
  @IsString()
  @Max(EGYPT_MARKET_LIMITS.MAX_MEMO_LENGTH, {
    message: {
      en: `Memo cannot exceed ${EGYPT_MARKET_LIMITS.MAX_MEMO_LENGTH} characters`,
      ar: `لا يمكن أن تتجاوز المذكرة ${EGYPT_MARKET_LIMITS.MAX_MEMO_LENGTH} حرف`
    }
  })
  memo?: string;

  @IsNumber({}, {
    message: {
      en: 'EGP equivalent amount must be a valid number',
      ar: 'يجب أن يكون المبلغ المعادل بالجنيه المصري رقمًا صحيحًا'
    }
  })
  egpEquivalent: number;

  /**
   * Validates a payment request with enhanced Egyptian market rules
   * @param data - Payment request data to validate
   * @returns Promise<ErrorResponse | null> - Validation errors or null if valid
   */
  async validate(data: any): Promise<ErrorResponse | null> {
    // Transform and validate basic structure
    const validationResult = await validateInput(data, PaymentRequestValidator);
    if (validationResult) return validationResult;

    // Validate Pi amount with market-specific rules
    if (!validatePiAmount(data.amount)) {
      return {
        code: 3001, // DATA_VALIDATION_FAILED
        message: 'Invalid payment amount',
        details: [
          'Amount does not meet Egyptian market requirements',
          'المبلغ لا يتوافق مع متطلبات السوق المصري'
        ],
        timestamp: new Date().toISOString(),
        requestId: `val_${Date.now()}`
      };
    }

    // Additional Egyptian market-specific validations
    if (data.type === PaymentType.ESCROW && data.amount < EGYPT_MARKET_LIMITS.MIN_ESCROW_AMOUNT) {
      return {
        code: 3001,
        message: 'Invalid escrow amount',
        details: [
          `Escrow payments require minimum ${EGYPT_MARKET_LIMITS.MIN_ESCROW_AMOUNT} Pi`,
          `مدفوعات الضمان تتطلب حد أدنى ${EGYPT_MARKET_LIMITS.MIN_ESCROW_AMOUNT} باي`
        ],
        timestamp: new Date().toISOString(),
        requestId: `val_${Date.now()}`
      };
    }

    return null;
  }
}

/**
 * Validator class for payment confirmations with Egyptian market requirements
 */
export class PaymentConfirmationValidator {
  @IsNotEmpty({
    message: {
      en: 'Payment ID is required',
      ar: 'معرف الدفع مطلوب'
    }
  })
  @IsString()
  paymentId: string;

  @IsNotEmpty({
    message: {
      en: 'Pi transaction ID is required',
      ar: 'معرف معاملة باي مطلوب'
    }
  })
  @IsString()
  piTransactionId: string;

  @IsEnum(PaymentStatus, {
    message: {
      en: 'Invalid payment status',
      ar: 'حالة الدفع غير صالحة'
    }
  })
  status: PaymentStatus;

  @IsOptional()
  @IsString()
  @Max(EGYPT_MARKET_LIMITS.MAX_MEMO_LENGTH)
  memo?: string;

  @IsNumber({}, {
    message: {
      en: 'Confirmed EGP amount must be a valid number',
      ar: 'يجب أن يكون المبلغ المؤكد بالجنيه المصري رقمًا صحيحًا'
    }
  })
  confirmedEgpAmount: number;

  /**
   * Validates a payment confirmation with Egyptian market specifics
   * @param data - Payment confirmation data to validate
   * @returns Promise<ErrorResponse | null> - Validation errors or null if valid
   */
  async validate(data: any): Promise<ErrorResponse | null> {
    // Transform and validate basic structure
    const validationResult = await validateInput(data, PaymentConfirmationValidator);
    if (validationResult) return validationResult;

    // Validate payment status transitions
    if (data.status === PaymentStatus.COMPLETED && !data.piTransactionId) {
      return {
        code: 3001,
        message: 'Invalid payment confirmation',
        details: [
          'Pi transaction ID is required for completed payments',
          'معرف معاملة باي مطلوب للمدفوعات المكتملة'
        ],
        timestamp: new Date().toISOString(),
        requestId: `val_${Date.now()}`
      };
    }

    return null;
  }
}