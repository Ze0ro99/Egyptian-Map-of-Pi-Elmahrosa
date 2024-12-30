/**
 * @fileoverview Payment details page component for Egyptian Map of Pi marketplace
 * Implements comprehensive payment information display with Egyptian market adaptations,
 * RTL support, and enhanced Pi Network integration.
 * @version 1.0.0
 */

import { useEffect } from 'react';
import { GetServerSideProps, NextPage } from 'next';
import { useRouter } from 'next/router'; // @version ^13.0.0
import { useTranslation } from 'react-i18next'; // @version ^13.0.0
import { 
  Container, 
  Box, 
  Typography, 
  CircularProgress, 
  Alert 
} from '@mui/material'; // @version ^5.14.0
import { useTheme } from '@mui/material/styles';
import { useEgyptianDateTime } from '@egyptian-map-pi/utils'; // @version ^1.0.0

import PaymentConfirmation from '../../components/payment/PaymentConfirmation';
import { usePayment } from '../../hooks/usePayment';
import { Payment, PaymentStatus } from '../../interfaces/payment.interface';
import { ErrorCodes } from '../../../backend/shared/constants/error-codes';

// Interface for page props with Egyptian market specifics
interface PaymentDetailsPageProps {
  paymentId: string;
  egyptianTaxId?: string;
  merchantVerificationStatus?: string;
}

/**
 * Enhanced payment details page component with Egyptian market support
 */
const PaymentDetailsPage: NextPage<PaymentDetailsPageProps> = ({
  paymentId,
  egyptianTaxId,
  merchantVerificationStatus
}) => {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { formatDateTime } = useEgyptianDateTime();
  
  const { 
    payment, 
    loading, 
    error,
    validateEgyptianTaxId,
    releasePaymentEscrow 
  } = usePayment();

  // Validate Egyptian tax ID on mount
  useEffect(() => {
    if (egyptianTaxId && !validateEgyptianTaxId(egyptianTaxId)) {
      router.push({
        pathname: '/error',
        query: { code: ErrorCodes.DATA_VALIDATION_FAILED }
      });
    }
  }, [egyptianTaxId, validateEgyptianTaxId, router]);

  // Handle successful payment completion
  const handlePaymentComplete = async (completedPayment: Payment) => {
    try {
      // Update payment status with Egyptian timezone
      await router.push({
        pathname: '/payments/success',
        query: { 
          id: completedPayment.id,
          timestamp: formatDateTime(new Date())
        }
      });
    } catch (err) {
      console.error('Payment completion error:', err);
    }
  };

  // Handle payment errors with bilingual support
  const handlePaymentError = (errorMessage: string) => {
    console.error('Payment error:', errorMessage);
  };

  // Render loading state
  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress size={40} />
        <Typography 
          variant="body1" 
          sx={{ mt: 2 }}
          align={theme.direction === 'rtl' ? 'right' : 'left'}
        >
          {t('payment.loading')}
        </Typography>
      </Container>
    );
  }

  // Render error state with bilingual support
  if (error) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Alert 
          severity="error"
          sx={{ 
            direction: theme.direction,
            textAlign: theme.direction === 'rtl' ? 'right' : 'left'
          }}
        >
          {error.ar || error.en}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography 
          variant="h4" 
          component="h1"
          align={theme.direction === 'rtl' ? 'right' : 'left'}
          gutterBottom
        >
          {t('payment.details.title')}
        </Typography>
      </Box>

      {/* Enhanced payment confirmation component */}
      <PaymentConfirmation
        paymentId={paymentId}
        onComplete={handlePaymentComplete}
        onError={handlePaymentError}
        egyptianTaxId={egyptianTaxId}
        merchantVerification={{
          status: merchantVerificationStatus,
          required: true
        }}
      />

      {/* Additional Egyptian market information */}
      {payment && (
        <Box sx={{ mt: 3 }}>
          {/* Tax information display */}
          {payment.egyptianTaxId && (
            <Typography 
              variant="body2" 
              color="textSecondary"
              align={theme.direction === 'rtl' ? 'right' : 'left'}
              gutterBottom
            >
              {t('payment.taxId')}: {payment.egyptianTaxId}
            </Typography>
          )}

          {/* Escrow information with Egyptian timezone */}
          {payment.status === PaymentStatus.ESCROW_PENDING && (
            <Alert 
              severity="info"
              sx={{ 
                mt: 2,
                direction: theme.direction,
                textAlign: theme.direction === 'rtl' ? 'right' : 'left'
              }}
            >
              {t('payment.escrow.pending')}
              <Typography variant="body2">
                {t('payment.escrow.releaseDate')}: {
                  formatDateTime(payment.escrowReleaseDate)
                }
              </Typography>
            </Alert>
          )}
        </Box>
      )}
    </Container>
  );
};

/**
 * Server-side props with Egyptian market validation
 */
export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params || {};
  
  if (!id || typeof id !== 'string') {
    return {
      notFound: true
    };
  }

  return {
    props: {
      paymentId: id
    }
  };
};

export default PaymentDetailsPage;