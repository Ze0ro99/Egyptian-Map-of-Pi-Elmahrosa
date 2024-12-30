// @mui/material version 5.14+
// react version 18.2
import React from 'react';
import { Button, ButtonProps } from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import CircularProgress from '@mui/material/CircularProgress';

// Extended button props interface with Egyptian Map of Pi specific features
interface CustomButtonProps extends ButtonProps {
  variant?: 'contained' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  ariaLabel?: string;
  touchRippleColor?: string;
  elevation?: number;
}

// Styled button component with Egyptian cultural adaptations
const StyledButton = styled(Button)(({ theme }) => ({
  // Remove text transform to support proper Arabic text display
  textTransform: 'none',
  
  // Enhanced border radius for Egyptian aesthetic
  borderRadius: theme.shape.borderRadius * 1.5,
  
  // RTL-aware font family selection
  fontFamily: theme.direction === 'rtl' 
    ? theme.typography.fontFamilyArabic 
    : theme.typography.fontFamily,
  
  // Enhanced touch target size (minimum 44px as per accessibility guidelines)
  padding: theme.spacing(1.5, 4),
  minHeight: 44,
  minWidth: 88,
  
  // Positioning context for loading spinner
  position: 'relative',
  
  // Smooth transitions for all interactive states
  transition: theme.transitions.create([
    'background-color',
    'box-shadow',
    'border-color',
    'color'
  ], {
    duration: theme.transitions.duration.short
  }),

  // Primary variant styling
  '&.MuiButton-containedPrimary': {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    boxShadow: theme.customShadows?.primary,
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
      transform: 'translateY(-1px)'
    }
  },

  // Secondary variant styling
  '&.MuiButton-containedSecondary': {
    backgroundColor: theme.palette.secondary.main,
    color: theme.palette.secondary.contrastText,
    boxShadow: theme.customShadows?.secondary,
    '&:hover': {
      backgroundColor: theme.palette.secondary.dark,
      transform: 'translateY(-1px)'
    }
  },

  // Outlined variant border enhancement
  '&.MuiButton-outlined': {
    borderWidth: 2,
    '&:hover': {
      borderWidth: 2
    }
  },

  // Disabled state styling
  '&.Mui-disabled': {
    backgroundColor: theme.palette.action.disabledBackground,
    color: theme.palette.action.disabled
  },

  // Focus state enhancement for accessibility
  '&:focus-visible': {
    outline: `3px solid ${theme.palette.primary.main}`,
    outlineOffset: 2
  },

  // RTL-specific adjustments
  ...(theme.direction === 'rtl' && {
    '& .MuiButton-startIcon': {
      marginLeft: theme.spacing(1),
      marginRight: -4
    },
    '& .MuiButton-endIcon': {
      marginRight: theme.spacing(1),
      marginLeft: -4
    }
  })
}));

// Styled loading spinner
const LoadingSpinner = styled(CircularProgress)(({ theme }) => ({
  position: 'absolute',
  left: '50%',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  color: theme.palette.primary.contrastText
}));

// Main button component with enhanced features
const CustomButton = React.memo<CustomButtonProps>(({
  children,
  variant = 'contained',
  size = 'medium',
  color = 'primary',
  fullWidth = false,
  disabled = false,
  loading = false,
  startIcon,
  endIcon,
  onClick,
  ariaLabel,
  touchRippleColor,
  elevation,
  ...props
}) => {
  const theme = useTheme();

  // Compute loading spinner size based on button size
  const getSpinnerSize = () => {
    switch (size) {
      case 'small':
        return 20;
      case 'large':
        return 28;
      default:
        return 24;
    }
  };

  return (
    <StyledButton
      variant={variant}
      size={size}
      color={color}
      fullWidth={fullWidth}
      disabled={disabled || loading}
      startIcon={!loading && startIcon}
      endIcon={!loading && endIcon}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-busy={loading}
      TouchRippleProps={{
        color: touchRippleColor
      }}
      elevation={elevation}
      {...props}
    >
      {/* Hide content during loading */}
      <span style={{ visibility: loading ? 'hidden' : 'visible' }}>
        {children}
      </span>
      
      {/* Show loading spinner when loading */}
      {loading && (
        <LoadingSpinner
          size={getSpinnerSize()}
          thickness={4}
          aria-label="Loading"
        />
      )}
    </StyledButton>
  );
});

// Display name for debugging
CustomButton.displayName = 'CustomButton';

export default CustomButton;