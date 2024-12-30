/**
 * @fileoverview Payment history page component for Egyptian Map of Pi marketplace
 * Displays user's Pi cryptocurrency transaction history with RTL support,
 * enhanced security features, and Egyptian market-specific functionality.
 * @version 1.0.0
 */

import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next'; // ^12.0.0
import { 
  Container, 
  Typography, 
  Box, 
  CircularProgress, 
  Alert 
} from '@mui/material'; // v5.14+

import MainLayout from '../../components/layout/MainLayout';
import TransactionHistory from '../../components/payment/TransactionHistory';
import { usePayment } from '../../hooks/usePayment';
import { useAuth } from '../../hooks/useAuth';

/**
 * Enhanced payment history page with Egyptian market features
 */
const PaymentHistory: React.FC = () => {
  // Initialize hooks
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const { loading, error } = usePayment();

  // Get current language direction
  const isRTL = i18n.language === 'ar';

  /**
   * Handle transaction history errors
   */
  const handleError = useCallback((error: Error) => {
    console.error('Transaction history error:', error);
  }, []);

  /**
   * Verify authentication on mount
   */
  useEffect(() => {
    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      window.location.href = '/auth/login';
    }
  }, [isAuthenticated]);

  return (
    <MainLayout>
      <Container 
        sx={{ 
          paddingTop: 3, 
          paddingBottom: 3,
          direction: isRTL ? 'rtl' : 'ltr'
        }}
      >
        {/* Page Title */}
        <Typography 
          variant="h4" 
          component="h1"
          sx={{
            marginBottom: 3,
            textAlign: { xs: 'center', sm: isRTL ? 'right' : 'left' },
            fontFamily: isRTL ? 'Cairo, Roboto, sans-serif' : 'inherit'
          }}
        >
          {t('payments.history.title')}
        </Typography>

        {/* Error Alert */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              marginBottom: 2,
              direction: isRTL ? 'rtl' : 'ltr'
            }}
          >
            {isRTL ? error.ar : error.en}
          </Alert>
        )}

        {/* Loading State */}
        {loading ? (
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center',
              padding: 4 
            }}
          >
            <CircularProgress 
              size={40}
              aria-label={t('common.loading')}
            />
          </Box>
        ) : (
          /* Transaction History Component */
          <TransactionHistory
            userId={user?.piId || ''}
            limit={10}
            onError={handleError}
            className="payment-history-table"
          />
        )}
      </Container>
    </MainLayout>
  );
};

// Export enhanced payment history page
export default PaymentHistory;