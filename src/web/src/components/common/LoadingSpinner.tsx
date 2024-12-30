import React from 'react';
import { CircularProgress, Box, useTheme } from '@mui/material';  // @version 5.14+
import '../../styles/theme.css';

/**
 * Props interface for the LoadingSpinner component
 */
interface LoadingSpinnerProps {
  /** Size of the spinner - can be a number for custom size or preset size */
  size?: number | 'small' | 'medium' | 'large';
  /** Custom color for the spinner - defaults to primary theme color */
  color?: string;
  /** Whether to show the spinner as an overlay with backdrop */
  overlay?: boolean;
  /** Accessibility label for screen readers */
  ariaLabel?: string;
}

/**
 * Converts size prop to pixel value based on device size and RTL context
 * @param size - The size prop value
 * @param isMobile - Whether the device is mobile
 * @returns The calculated pixel size
 */
const getSizeValue = (size: number | string | undefined, isMobile: boolean): number => {
  if (typeof size === 'number') {
    return isMobile ? size * 0.8 : size; // Scale down for mobile
  }

  // Default sizes optimized for touch targets and visibility
  const sizes = {
    small: isMobile ? 20 : 24,
    medium: isMobile ? 32 : 40,
    large: isMobile ? 44 : 56
  };

  return sizes[size || 'medium'];
};

/**
 * LoadingSpinner component providing visual feedback during async operations
 * Implements Egyptian Map of Pi design system with accessibility and RTL support
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color,
  overlay = false,
  ariaLabel = 'Loading content'
}) => {
  const theme = useTheme();
  const isMobile = window.innerWidth < 768; // Basic mobile detection
  
  // Calculate spinner size
  const spinnerSize = getSizeValue(size, isMobile);

  // Use Egyptian theme color if no custom color provided
  const spinnerColor = color || getComputedStyle(document.documentElement)
    .getPropertyValue('--primary-main').trim();

  // Base styles for the spinner container
  const containerStyles = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    ...(overlay && {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      zIndex: theme.zIndex.modal - 1,
    }),
    // RTL support
    [theme.direction === 'rtl' ? 'marginLeft' : 'marginRight']: 'auto',
    [theme.direction === 'rtl' ? 'marginRight' : 'marginLeft']: 'auto',
  } as const;

  // Enhanced accessibility attributes
  const accessibilityProps = {
    role: 'progressbar',
    'aria-label': ariaLabel,
    'aria-busy': true,
    'aria-live': 'polite' as const,
  };

  return (
    <Box sx={containerStyles}>
      <CircularProgress
        size={spinnerSize}
        sx={{
          color: spinnerColor,
          // Optimize animation performance
          animation: `${theme.transitions.create(['transform'], {
            duration: theme.transitions.duration.standard,
          })}`,
          // High contrast support
          '@media (prefers-contrast: high)': {
            color: theme.palette.common.black,
          },
        }}
        {...accessibilityProps}
      />
    </Box>
  );
};

export default LoadingSpinner;