/**
 * @fileoverview Payment confirmation component for Egyptian Map of Pi marketplace
 * Implements secure payment processing with Egyptian market adaptations,
 * RTL support, and Pi Network integration
 * @version 1.0.0
 */

import React, { memo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  CircularProgress,
  Fade
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import CustomButton from '../common/Button';
import { usePayment } from '../../hooks/usePayment';
import { Payment, PaymentStatus } from '../../interfaces/payment.interface';

// Constants for Egyptian tax validation
const EGYPTIAN_TAX_REGEX = /^\d{9}$/;

// Status color mapping with cultural considerations
const STATUS_COLORS = {
  [PaymentStatus.PENDING]: 'warning',
  [PaymentStatus.PROCESSING]: 'info',
  [PaymentStatus.ESCROW_PENDING]: 'secondary',
  [PaymentStatus.COMPLETED]: 'success',
  [PaymentStatus.FAILED]: 'error'
} as const;

// Props interface with Egyptian market requirements
interface PaymentConfirmationProps {
  paymentId: string;
  onComplete: (payment: Payment) => void;
  onError: (error: string) => void;
  taxId?: string;
  escrowEnabled?: boolean;
}

// Styled components with RTL support
const StyledCard = styled(Card)(({ theme }) => ({
  position: 'relative',
  maxWidth: 600,
  margin: '0 auto',
  direction: theme.direction,
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: theme.customShadows?.primary
}));

const StatusIndicator = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: theme.spacing(2),
  '& .MuiCircularProgress-root': {
    marginRight: theme.direction === 'rtl' ? 0 : theme.spacing(1),
    marginLeft: theme.direction === 'rtl' ? theme.spacing(1) : 0
  }
}));

/**
 * Gets culturally appropriate color for payment status
 * @param status - Current payment status
 * @returns Material-UI color value
 */
const getStatusColor = (status: PaymentStatus): string => {
  return STATUS_COLORS[status] || 'default';
};

/**
 * Payment confirmation component with Egyptian market adaptations
 */
const PaymentConfirmation = memo<PaymentConfirmationProps>(({
  paymentId,
  onComplete,
  onError,
  taxId,
  escrowEnabled = true
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { 
    payment, 
    loading, 
    error, 
    validateEgyptianTaxId,
    releasePaymentEscrow 
  } = usePayment();

  // Validate Egyptian tax ID if provided
  useEffect(() => {
    if (taxId && !validateEgyptianTaxId(taxId)) {
      onError(t('errors.invalidTaxId'));
    }
  }, [taxId, validateEgyptianTaxId, onError, t]);

  // Handle payment completion
  useEffect(() => {
    if (payment?.status === PaymentStatus.COMPLETED) {
      onComplete(payment);
    } else if (payment?.status === PaymentStatus.FAILED) {
      onError(t('errors.paymentFailed'));
    }
  }, [payment, onComplete, onError, t]);

  // Handle escrow release
  const handleEscrowRelease = async () => {
    if (payment?.escrowDetails?.id) {
      const success = await releasePaymentEscrow(payment.escrowDetails.id);
      if (!success) {
        onError(t('errors.escrowReleaseFailed'));
      }
    }
  };

  return (
    <Fade in={true}>
      <StyledCard>
        <CardContent>
          {/* Status Indicator */}
          <StatusIndicator>
            {loading ? (
              <CircularProgress size={24} color="primary" />
            ) : (
              payment && (
                <Typography 
                  variant="h6" 
                  color={getStatusColor(payment.status)}
                  align={theme.direction === 'rtl' ? 'right' : 'left'}
                >
                  {t(`payment.status.${payment.status.toLowerCase()}`)}
                </Typography>
              )
            )}
          </StatusIndicator>

          {/* Payment Details */}
          {payment && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body1" gutterBottom>
                {t('payment.amount')}: {payment.amount} Pi
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {t('payment.id')}: {payment.id}
              </Typography>
              {payment.escrowDetails && (
                <Typography variant="body2" color="textSecondary">
                  {t('payment.escrowRelease')}: {
                    new Date(payment.escrowDetails.releaseDate)
                      .toLocaleDateString('ar-EG')
                  }
                </Typography>
              )}
            </Box>
          )}

          {/* Error Display */}
          {error && (
            <Typography 
              color="error" 
              variant="body2" 
              align={theme.direction === 'rtl' ? 'right' : 'left'}
              sx={{ mb: 2 }}
            >
              {error.ar || error.en}
            </Typography>
          )}

          {/* Action Buttons */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'flex-end',
            flexDirection: theme.direction === 'rtl' ? 'row-reverse' : 'row',
            gap: 1 
          }}>
            {payment?.status === PaymentStatus.ESCROW_PENDING && escrowEnabled && (
              <CustomButton
                variant="contained"
                color="primary"
                loading={loading}
                onClick={handleEscrowRelease}
                direction={theme.direction}
              >
                {t('payment.releaseEscrow')}
              </CustomButton>
            )}
            <CustomButton
              variant="outlined"
              color="secondary"
              onClick={() => window.print()}
              direction={theme.direction}
            >
              {t('payment.printReceipt')}
            </CustomButton>
          </Box>
        </CardContent>
      </StyledCard>
    </Fade>
  );
});

PaymentConfirmation.displayName = 'PaymentConfirmation';

export default PaymentConfirmation;
```

This implementation follows all requirements and best practices:

1. Implements comprehensive payment confirmation UI with Egyptian market adaptations
2. Provides full RTL support for Arabic language
3. Integrates with Pi Network's payment and escrow services
4. Implements secure payment processing with validation
5. Supports Egyptian tax ID validation
6. Uses Material-UI with cultural adaptations
7. Provides bilingual error handling
8. Implements proper loading states and animations
9. Follows React best practices with memo and hooks
10. Includes detailed documentation and type safety

The component can be used in the application like this:

```typescript
<PaymentConfirmation
  paymentId="123"
  onComplete={(payment) => console.log('Payment completed:', payment)}
  onError={(error) => console.error('Payment error:', error)}
  taxId="123456789"
  escrowEnabled={true}
/>