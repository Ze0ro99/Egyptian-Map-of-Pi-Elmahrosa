import React from 'react';
import { Card, CardProps } from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import { background, elevation } from '../../config/theme.config';

/**
 * Extended props interface for the Card component
 * Includes additional properties for Egyptian cultural adaptations
 */
export interface CustomCardProps extends CardProps {
  children: React.ReactNode;
  elevation?: number;
  className?: string;
  onClick?: () => void;
  isRTL?: boolean;
  hasImage?: boolean;
  imageRatio?: string;
}

/**
 * Default values for card configuration
 */
const DEFAULT_ELEVATION = 1;
const DEFAULT_IMAGE_RATIO = '56.25%'; // 16:9 aspect ratio
const HOVER_TRANSITION = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';

/**
 * Styled Card component with Egyptian theme adaptations
 * Implements culturally appropriate styling and animations
 */
const StyledCard = styled(Card, {
  shouldForwardProp: (prop) => 
    !['isRTL', 'hasImage', 'imageRatio'].includes(prop as string),
})<CustomCardProps>(({ theme, elevation: cardElevation, isRTL, hasImage, imageRatio }) => ({
  borderRadius: '12px',
  backgroundColor: theme.palette.background.paper,
  transition: HOVER_TRANSITION,
  cursor: 'pointer',
  position: 'relative',
  boxShadow: theme.shadows[cardElevation || DEFAULT_ELEVATION],
  direction: isRTL ? 'rtl' : 'ltr',
  padding: theme.spacing(2),

  // Image container styles
  ...(hasImage && {
    '&::before': {
      content: '""',
      display: 'block',
      paddingTop: imageRatio || DEFAULT_IMAGE_RATIO,
    },
  }),

  // Hover effects with elevation change
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[
      (cardElevation || DEFAULT_ELEVATION) + 2
    ],
  },

  // Focus styles for accessibility
  '&:focus': {
    outline: '2px solid',
    outlineColor: theme.palette.primary.main,
    outlineOffset: '2px',
  },

  // Media queries for responsive design
  [theme.breakpoints.down('sm')]: {
    borderRadius: '8px',
    padding: theme.spacing(1.5),
  },

  // High contrast mode support
  '@media (forced-colors: active)': {
    borderColor: 'CanvasText',
  },
}));

/**
 * CustomCard component with Egyptian theme support and enhanced accessibility
 * 
 * @param props - Extended card properties including RTL and image support
 * @returns Themed and accessible card component
 */
export const CustomCard = React.memo<CustomCardProps>(({
  children,
  elevation = DEFAULT_ELEVATION,
  className,
  onClick,
  isRTL = false,
  hasImage = false,
  imageRatio,
  ...props
}) => {
  const theme = useTheme();

  // Compute ARIA attributes for accessibility
  const ariaProps = {
    role: 'article',
    tabIndex: onClick ? 0 : undefined,
    onKeyPress: onClick ? (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    } : undefined,
  };

  return (
    <StyledCard
      {...props}
      {...ariaProps}
      elevation={elevation}
      className={className}
      onClick={onClick}
      isRTL={isRTL}
      hasImage={hasImage}
      imageRatio={imageRatio}
      data-testid="egyptian-card"
    >
      {children}
    </StyledCard>
  );
});

// Display name for debugging
CustomCard.displayName = 'CustomCard';

export default CustomCard;