// @version 1.0.0
// Price display component with Pi/EGP support and RTL/LTR handling
// Dependencies:
// - react: ^18.2.0
// - @mui/material: ^5.14.0

import React, { useMemo, useCallback } from 'react';
import { Box, Typography, Skeleton } from '@mui/material';
import { formatPiPrice, formatEgpPrice } from '../../utils/format.util';
import type { Language } from '../../types';

/**
 * Props interface for the PriceDisplay component
 */
interface PriceDisplayProps {
  /** Price amount in Pi cryptocurrency */
  piPrice: number;
  /** Current locale for formatting (ar/en) */
  locale: Language;
  /** Whether to show EGP equivalent price */
  showEgpEquivalent?: boolean;
  /** Optional custom styles */
  style?: React.CSSProperties;
  /** Optional CSS class name */
  className?: string;
  /** Loading state indicator */
  isLoading?: boolean;
  /** Typography size variant */
  size?: 'small' | 'medium' | 'large';
  /** Error callback handler */
  onError?: (error: Error) => void;
}

/**
 * Current Pi to EGP exchange rate
 * TODO: Replace with actual exchange rate from API
 */
const PI_TO_EGP_RATE = 150;

/**
 * Memoized function to calculate EGP equivalent of Pi price
 */
const calculateEgpEquivalent = (piPrice: number): number | null => {
  try {
    if (!piPrice || piPrice < 0 || !Number.isFinite(piPrice)) {
      return null;
    }
    return Math.round((piPrice * PI_TO_EGP_RATE) * 100) / 100;
  } catch (error) {
    console.error('Error calculating EGP equivalent:', error);
    return null;
  }
};

/**
 * Typography variant mapping based on size prop
 */
const sizeVariantMap = {
  small: {
    primary: 'body2',
    secondary: 'caption'
  },
  medium: {
    primary: 'body1',
    secondary: 'body2'
  },
  large: {
    primary: 'h6',
    secondary: 'body1'
  }
} as const;

/**
 * PriceDisplay component for showing prices in Pi and optionally EGP
 * with full RTL/LTR support and localization
 */
export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  piPrice,
  locale,
  showEgpEquivalent = true,
  style,
  className,
  isLoading = false,
  size = 'medium',
  onError
}) => {
  // Memoize the EGP calculation to prevent unnecessary recalculations
  const egpPrice = useMemo(() => {
    if (!showEgpEquivalent) return null;
    return calculateEgpEquivalent(piPrice);
  }, [piPrice, showEgpEquivalent]);

  // Error handler callback
  const handleError = useCallback((error: Error) => {
    console.error('PriceDisplay error:', error);
    onError?.(error);
  }, [onError]);

  // Format prices with error handling
  const formattedPiPrice = useMemo(() => {
    try {
      return formatPiPrice(piPrice, locale);
    } catch (error) {
      handleError(error as Error);
      return null;
    }
  }, [piPrice, locale, handleError]);

  const formattedEgpPrice = useMemo(() => {
    try {
      return egpPrice ? formatEgpPrice(egpPrice, locale) : null;
    } catch (error) {
      handleError(error as Error);
      return null;
    }
  }, [egpPrice, locale, handleError]);

  // Get typography variants based on size
  const variants = sizeVariantMap[size];

  // Handle loading state
  if (isLoading) {
    return (
      <Box
        className={className}
        style={style}
        display="flex"
        flexDirection="column"
        alignItems={locale === 'ar' ? 'flex-end' : 'flex-start'}
      >
        <Skeleton width={100} height={24} />
        {showEgpEquivalent && <Skeleton width={80} height={20} />}
      </Box>
    );
  }

  // Handle error state
  if (!formattedPiPrice) {
    return (
      <Typography
        color="error"
        variant={variants.primary}
        className={className}
        style={style}
      >
        {locale === 'ar' ? 'خطأ في عرض السعر' : 'Error displaying price'}
      </Typography>
    );
  }

  return (
    <Box
      className={className}
      style={style}
      display="flex"
      flexDirection="column"
      alignItems={locale === 'ar' ? 'flex-end' : 'flex-start'}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
    >
      <Typography
        variant={variants.primary}
        component="div"
        fontWeight="bold"
        color="primary"
      >
        {formattedPiPrice}
      </Typography>
      
      {showEgpEquivalent && formattedEgpPrice && (
        <Typography
          variant={variants.secondary}
          component="div"
          color="text.secondary"
          sx={{ mt: 0.5 }}
        >
          {formattedEgpPrice}
        </Typography>
      )}
    </Box>
  );
};

// Default export for the component
export default PriceDisplay;