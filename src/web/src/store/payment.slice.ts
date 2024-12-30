/**
 * @fileoverview Redux Toolkit slice for payment state management in Egyptian Map of Pi
 * Implements secure payment processing with Egyptian market validation and compliance
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5
import { Payment, PaymentStatus } from '../interfaces/payment.interface';
import { paymentApi } from '../api/payment.api';
import { ErrorCodes } from '../../../backend/shared/constants/error-codes';
import { getErrorMessage } from '../constants/errors';

/**
 * Verification status for merchant and tax ID validation
 */
export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED'
}

/**
 * Enhanced payment state interface with Egyptian market support
 */
interface PaymentState {
  payments: Record<string, Payment>;
  userPayments: string[];
  loading: boolean;
  error: {
    ar: string | null;
    en: string | null;
  };
  currentPayment: string | null;
  merchantVerificationStatus: Record<string, VerificationStatus>;
  taxIdValidationStatus: Record<string, VerificationStatus>;
}

/**
 * Initial state with bilingual error support
 */
const initialState: PaymentState = {
  payments: {},
  userPayments: [],
  loading: false,
  error: {
    ar: null,
    en: null
  },
  currentPayment: null,
  merchantVerificationStatus: {},
  taxIdValidationStatus: {}
};

/**
 * Enhanced async thunk for creating payments with Egyptian market validation
 */
export const createPaymentThunk = createAsyncThunk(
  'payments/createPayment',
  async (paymentData: {
    amount: number;
    listingId: string;
    sellerId: string;
    egyptianTaxId?: string;
  }, { rejectWithValue }) => {
    try {
      // Validate Egyptian tax ID if provided
      if (paymentData.egyptianTaxId) {
        const isValid = await paymentApi.validateEgyptianTaxId(paymentData.egyptianTaxId);
        if (!isValid) {
          throw new Error(ErrorCodes.BUSINESS_MERCHANT_NOT_VERIFIED.toString());
        }
      }

      // Create payment with validated data
      const payment = await paymentApi.createPayment(paymentData);
      return payment;
    } catch (error) {
      return rejectWithValue({
        code: error.message,
        messageAr: getErrorMessage(Number(error.message), 'ar'),
        messageEn: getErrorMessage(Number(error.message), 'en')
      });
    }
  }
);

/**
 * Async thunk for retrieving payment details
 */
export const getPaymentThunk = createAsyncThunk(
  'payments/getPayment',
  async (paymentId: string, { rejectWithValue }) => {
    try {
      const payment = await paymentApi.getPayment(paymentId);
      return payment;
    } catch (error) {
      return rejectWithValue({
        code: error.message,
        messageAr: getErrorMessage(Number(error.message), 'ar'),
        messageEn: getErrorMessage(Number(error.message), 'en')
      });
    }
  }
);

/**
 * Async thunk for retrieving user payments with filtering
 */
export const getUserPaymentsThunk = createAsyncThunk(
  'payments/getUserPayments',
  async (userId: string, { rejectWithValue }) => {
    try {
      const payments = await paymentApi.getUserPayments(userId);
      return payments;
    } catch (error) {
      return rejectWithValue({
        code: error.message,
        messageAr: getErrorMessage(Number(error.message), 'ar'),
        messageEn: getErrorMessage(Number(error.message), 'en')
      });
    }
  }
);

/**
 * Async thunk for validating Egyptian merchant credentials
 */
export const validateMerchantThunk = createAsyncThunk(
  'payments/validateMerchant',
  async (merchantData: {
    merchantId: string;
    taxId: string;
    businessRegistrationNumber: string;
  }, { rejectWithValue }) => {
    try {
      const isVerified = await paymentApi.verifyEgyptianMerchant(merchantData);
      return { merchantId: merchantData.merchantId, isVerified };
    } catch (error) {
      return rejectWithValue({
        code: error.message,
        messageAr: getErrorMessage(Number(error.message), 'ar'),
        messageEn: getErrorMessage(Number(error.message), 'en')
      });
    }
  }
);

/**
 * Payment slice with enhanced Egyptian market support
 */
const paymentSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    setCurrentPayment: (state, action: PayloadAction<string | null>) => {
      state.currentPayment = action.payload;
    },
    clearErrors: (state) => {
      state.error = { ar: null, en: null };
    },
    resetPaymentState: () => initialState
  },
  extraReducers: (builder) => {
    // Create Payment
    builder.addCase(createPaymentThunk.pending, (state) => {
      state.loading = true;
      state.error = { ar: null, en: null };
    });
    builder.addCase(createPaymentThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.payments[action.payload.id] = action.payload;
      state.userPayments.unshift(action.payload.id);
      state.currentPayment = action.payload.id;
    });
    builder.addCase(createPaymentThunk.rejected, (state, action: any) => {
      state.loading = false;
      state.error = {
        ar: action.payload.messageAr,
        en: action.payload.messageEn
      };
    });

    // Get Payment
    builder.addCase(getPaymentThunk.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getPaymentThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.payments[action.payload.id] = action.payload;
    });
    builder.addCase(getPaymentThunk.rejected, (state, action: any) => {
      state.loading = false;
      state.error = {
        ar: action.payload.messageAr,
        en: action.payload.messageEn
      };
    });

    // Get User Payments
    builder.addCase(getUserPaymentsThunk.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getUserPaymentsThunk.fulfilled, (state, action) => {
      state.loading = false;
      action.payload.forEach(payment => {
        state.payments[payment.id] = payment;
      });
      state.userPayments = action.payload.map(payment => payment.id);
    });
    builder.addCase(getUserPaymentsThunk.rejected, (state, action: any) => {
      state.loading = false;
      state.error = {
        ar: action.payload.messageAr,
        en: action.payload.messageEn
      };
    });

    // Validate Merchant
    builder.addCase(validateMerchantThunk.fulfilled, (state, action) => {
      state.merchantVerificationStatus[action.payload.merchantId] = 
        action.payload.isVerified ? VerificationStatus.VERIFIED : VerificationStatus.FAILED;
    });
  }
});

// Export actions
export const { setCurrentPayment, clearErrors, resetPaymentState } = paymentSlice.actions;

// Export selectors
export const selectPayments = (state: { payments: PaymentState }) => state.payments.payments;
export const selectCurrentPayment = (state: { payments: PaymentState }) => 
  state.payments.currentPayment ? state.payments.payments[state.payments.currentPayment] : null;
export const selectMerchantVerificationStatus = (state: { payments: PaymentState }, merchantId: string) => 
  state.payments.merchantVerificationStatus[merchantId];
export const selectTaxIdValidationStatus = (state: { payments: PaymentState }, taxId: string) => 
  state.payments.taxIdValidationStatus[taxId];
export const selectError = (state: { payments: PaymentState }) => state.payments.error;

// Export reducer
export default paymentSlice.reducer;