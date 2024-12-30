/**
 * @fileoverview Payment validation schemas and functions for the Egyptian Map of Pi
 * Implements comprehensive validation for Pi cryptocurrency payments with Egyptian market support
 * @version 1.0.0
 */

import { z } from 'zod'; // v3.22.0
import { Payment } from '../interfaces/payment.interface';
import { VALIDATION_LIMITS } from '../constants/validation';

/**
 * Enhanced validation result interface with bilingual error messages
 */
interface ValidationResult {
  isValid: boolean;
  errors: {
    en: string[];
    ar: string[];
  };
}

/**
 * Comprehensive Zod schema for payment data validation
 * Implements strict validation rules for Pi payments in Egyptian market
 */
export const paymentSchema = z.object({
  // Payment amount in Pi with market-specific limits
  amount: z.number()
    .min(VALIDATION_LIMITS.MIN_PI_PRICE, {
      message: {
        en: `Payment amount must be at least ${VALIDATION_LIMITS.MIN_PI_PRICE} Pi`,
        ar: `يجب أن يكون مبلغ الدفع ${VALIDATION_LIMITS.MIN_PI_PRICE} Pi على الأقل`
      }
    })
    .max(VALIDATION_LIMITS.MAX_PI_PRICE, {
      message: {
        en: `Payment amount cannot exceed ${VALIDATION_LIMITS.MAX_PI_PRICE} Pi`,
        ar: `لا يمكن أن يتجاوز مبلغ الدفع ${VALIDATION_LIMITS.MAX_PI_PRICE} Pi`
      }
    }),

  // Pi Network IDs for transaction parties
  buyerId: z.string().uuid({
    message: {
      en: 'Invalid buyer ID format',
      ar: 'تنسيق معرف المشتري غير صالح'
    }
  }),

  sellerId: z.string().uuid({
    message: {
      en: 'Invalid seller ID format',
      ar: 'تنسيق معرف البائع غير صالح'
    }
  }),

  // Associated listing identifier
  listingId: z.string().uuid({
    message: {
      en: 'Invalid listing ID format',
      ar: 'تنسيق معرف القائمة غير صالح'
    }
  }),

  // Optional escrow service identifier
  escrowId: z.string().uuid({
    message: {
      en: 'Invalid escrow ID format',
      ar: 'تنسيق معرف الضمان غير صالح'
    }
  }).optional(),

  // Pi Network payment transaction ID
  piPaymentId: z.string().optional(),

  // Egyptian tax registration number (optional)
  egyptianTaxId: z.string().regex(/^\d{9}$/, {
    message: {
      en: 'Invalid Egyptian tax ID format (9 digits required)',
      ar: 'تنسيق الرقم الضريبي المصري غير صالح (مطلوب 9 أرقام)'
    }
  }).optional(),

  // Payment status validation
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'ESCROW_PENDING', 
                 'ESCROW_LOCKED', 'DISPUTE_RESOLUTION', 'REFUNDED', 'CANCELLED'], {
    errorMap: () => ({
      message: {
        en: 'Invalid payment status',
        ar: 'حالة الدفع غير صالحة'
      }
    })
  })
});

/**
 * Validates payment amount against Pi Network limits with Egyptian market considerations
 * @param amount - Payment amount to validate
 * @returns ValidationResult with bilingual error messages
 */
export function validatePaymentAmount(amount: number): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: {
      en: [],
      ar: []
    }
  };

  // Check if amount is a valid number
  if (isNaN(amount) || !isFinite(amount)) {
    result.isValid = false;
    result.errors.en.push('Invalid payment amount');
    result.errors.ar.push('مبلغ الدفع غير صالح');
    return result;
  }

  // Validate against minimum limit
  if (amount < VALIDATION_LIMITS.MIN_PI_PRICE) {
    result.isValid = false;
    result.errors.en.push(`Payment amount must be at least ${VALIDATION_LIMITS.MIN_PI_PRICE} Pi`);
    result.errors.ar.push(`يجب أن يكون مبلغ الدفع ${VALIDATION_LIMITS.MIN_PI_PRICE} Pi على الأقل`);
  }

  // Validate against maximum limit
  if (amount > VALIDATION_LIMITS.MAX_PI_PRICE) {
    result.isValid = false;
    result.errors.en.push(`Payment amount cannot exceed ${VALIDATION_LIMITS.MAX_PI_PRICE} Pi`);
    result.errors.ar.push(`لا يمكن أن يتجاوز مبلغ الدفع ${VALIDATION_LIMITS.MAX_PI_PRICE} Pi`);
  }

  return result;
}

/**
 * Validates complete payment data object with enhanced security checks
 * @param paymentData - Payment data to validate
 * @returns ValidationResult with detailed error information
 */
export function validatePaymentData(paymentData: Partial<Payment>): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: {
      en: [],
      ar: []
    }
  };

  try {
    // Validate against Zod schema
    const parsed = paymentSchema.parse(paymentData);

    // Validate payment amount
    const amountValidation = validatePaymentAmount(parsed.amount);
    if (!amountValidation.isValid) {
      result.isValid = false;
      result.errors.en.push(...amountValidation.errors.en);
      result.errors.ar.push(...amountValidation.errors.ar);
    }

    // Verify buyer and seller are different
    if (parsed.buyerId === parsed.sellerId) {
      result.isValid = false;
      result.errors.en.push('Buyer and seller cannot be the same');
      result.errors.ar.push('لا يمكن أن يكون المشتري والبائع نفس الشخص');
    }

    // Additional Egyptian market-specific validations
    if (parsed.egyptianTaxId) {
      // Verify checksum of Egyptian tax ID if provided
      const isValidTaxId = verifyEgyptianTaxId(parsed.egyptianTaxId);
      if (!isValidTaxId) {
        result.isValid = false;
        result.errors.en.push('Invalid Egyptian tax ID checksum');
        result.errors.ar.push('المجموع الاختباري للرقم الضريبي المصري غير صالح');
      }
    }

  } catch (error) {
    result.isValid = false;
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        const message = err.message as { en: string; ar: string };
        result.errors.en.push(message.en);
        result.errors.ar.push(message.ar);
      });
    }
  }

  return result;
}

/**
 * Verifies the checksum of an Egyptian tax ID
 * @param taxId - Egyptian tax ID to verify
 * @returns boolean indicating if the tax ID is valid
 */
function verifyEgyptianTaxId(taxId: string): boolean {
  // Implementation of Egyptian tax ID verification algorithm
  if (!/^\d{9}$/.test(taxId)) {
    return false;
  }

  // Simple checksum verification (example implementation)
  const digits = taxId.split('').map(Number);
  const checksum = digits.reduce((sum, digit, index) => sum + digit * (9 - index), 0) % 11;
  
  return checksum === digits[8];
}