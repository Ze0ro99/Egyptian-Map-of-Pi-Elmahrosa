/**
 * @fileoverview Enhanced payment form component for the Egyptian Map of Pi marketplace
 * Implements secure payment processing with bilingual support (Arabic/English),
 * RTL layout, and Egyptian market compliance features.
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form'; // v7.45.0
import { zodResolver } from '@hookform/resolvers/zod'; // v3.3.0
import { useTranslation } from 'react-i18next'; // v22.0.0
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputAdornment,
  TextField,
  Typography,
  useTheme,
  Alert,
} from '@mui/material'; // v5.14+
import { Payment, PaymentStatus } from '../../interfaces/payment.interface';
import { paymentSchema, validatePaymentData } from '../../validators/payment.validator';
import { VALIDATION_LIMITS } from '../../constants/validation';

/**
 * Props interface for the PaymentForm component
 */
interface PaymentFormProps {
  listingId: string;
  sellerId: string;
  amount: number;
  taxId?: string;
  currency?: string;
  onSuccess: (payment: Payment) => void;
  onError: (error: Error) => void;
}

/**
 * Form data interface with Egyptian market requirements
 */
interface PaymentFormData {
  amount: number;
  listingId: string;
  sellerId: string;
  taxId?: string;
  escrowEnabled: boolean;
  currency: string;
}

/**
 * Enhanced payment form component with Egyptian market support
 * Implements secure payment processing with RTL layout and bilingual validation
 */
const PaymentForm: React.FC<PaymentFormProps> = React.memo(({
  listingId,
  sellerId,
  amount,
  taxId,
  currency = 'EGP',
  onSuccess,
  onError
}) => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with enhanced validation
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount,
      listingId,
      sellerId,
      taxId,
      escrowEnabled: true,
      currency
    }
  });

  // Watch form values for real-time validation
  const watchAmount = watch('amount');
  const watchEscrow = watch('escrowEnabled');

  /**
   * Handles payment form submission with enhanced validation
   * @param data - Form data to be processed
   */
  const onSubmit = useCallback(async (data: PaymentFormData) => {
    try {
      setIsProcessing(true);
      setError(null);

      // Validate payment data with Egyptian market requirements
      const validationResult = validatePaymentData({
        amount: data.amount,
        listingId: data.listingId,
        sellerId: data.sellerId,
        egyptianTaxId: data.taxId,
        status: PaymentStatus.PENDING
      });

      if (!validationResult.isValid) {
        throw new Error(
          i18n.language === 'ar' 
            ? validationResult.errors.ar[0] 
            : validationResult.errors.en[0]
        );
      }

      // Initialize Pi payment with escrow support
      const payment = await window.Pi.createPayment({
        amount: data.amount,
        memo: `Payment for listing ${data.listingId}`,
        metadata: {
          listingId: data.listingId,
          sellerId: data.sellerId,
          taxId: data.taxId,
          escrowEnabled: data.escrowEnabled,
          currency: data.currency
        }
      });

      onSuccess(payment);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment processing failed';
      setError(errorMessage);
      onError(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsProcessing(false);
    }
  }, [i18n.language, onSuccess, onError]);

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: 2,
        direction: i18n.language === 'ar' ? 'rtl' : 'ltr'
      }}
    >
      {/* Amount Field */}
      <FormControl error={!!errors.amount}>
        <TextField
          {...register('amount')}
          label={t('payment.amount')}
          type="number"
          InputProps={{
            startAdornment: <InputAdornment position="start">π</InputAdornment>,
            endAdornment: (
              <InputAdornment position="end">
                ≈ {(watchAmount * 30).toFixed(2)} {currency}
              </InputAdornment>
            )
          }}
          error={!!errors.amount}
          helperText={errors.amount?.message?.[i18n.language]}
          disabled={isProcessing}
        />
      </FormControl>

      {/* Tax ID Field */}
      <FormControl error={!!errors.taxId}>
        <TextField
          {...register('taxId')}
          label={t('payment.taxId')}
          placeholder={t('payment.taxIdPlaceholder')}
          error={!!errors.taxId}
          helperText={errors.taxId?.message?.[i18n.language]}
          disabled={isProcessing}
        />
      </FormControl>

      {/* Escrow Option */}
      <FormControlLabel
        control={
          <Checkbox
            {...register('escrowEnabled')}
            checked={watchEscrow}
            disabled={isProcessing}
          />
        }
        label={t('payment.escrowEnabled')}
      />

      {/* Payment Limits Info */}
      <Typography variant="caption" color="textSecondary">
        {t('payment.limits', {
          min: VALIDATION_LIMITS.MIN_PI_PRICE,
          max: VALIDATION_LIMITS.MAX_PI_PRICE
        })}
      </Typography>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        variant="contained"
        disabled={isProcessing}
        sx={{
          mt: 2,
          height: 48
        }}
      >
        {isProcessing ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          t('payment.submit')
        )}
      </Button>
    </Box>
  );
});

PaymentForm.displayName = 'PaymentForm';

export default PaymentForm;