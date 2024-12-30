/**
 * @fileoverview Enhanced marketplace listing card component for Egyptian Map of Pi
 * Implements Material Design with Egyptian cultural adaptations and bilingual support
 * @version 1.0.0
 */

import React, { useMemo, useCallback } from 'react';
import { CardMedia, CardContent, Typography, IconButton, Skeleton } from '@mui/material';
import { FavoriteIcon, VerifiedUserIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { styled } from '@mui/material/styles';

import type { Listing } from '../../interfaces/listing.interface';
import PriceDisplay from './PriceDisplay';
import CustomCard from '../common/Card';

// Version comments for external dependencies
// @mui/material: ^5.14.0
// @mui/icons-material: ^5.14.0
// react-i18next: ^12.0.0

/**
 * Props interface for the ListingCard component
 */
interface ListingCardProps {
  /** Listing data with Egyptian market specifics */
  listing: Listing;
  /** Click handler for the entire card */
  onClick: () => void;
  /** Click handler for favorite button */
  onFavoriteClick: () => void;
  /** Whether the listing is favorited */
  isFavorite: boolean;
  /** Optional CSS class name */
  className?: string;
  /** RTL layout flag */
  isRTL?: boolean;
  /** Image loading priority */
  imageLoadingPriority?: 'lazy' | 'eager';
  /** Show merchant verification badge */
  showMerchantBadge?: boolean;
}

/**
 * Styled components for enhanced visual presentation
 */
const StyledFavoriteButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  right: theme.direction === 'rtl' ? theme.spacing(1) : 'auto',
  left: theme.direction === 'rtl' ? 'auto' : theme.spacing(1),
  backgroundColor: theme.palette.background.paper,
  '&:hover': {
    backgroundColor: theme.palette.background.default,
  },
  zIndex: 1,
}));

const VerificationBadge = styled('div')(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  right: theme.direction === 'rtl' ? 'auto' : theme.spacing(1),
  left: theme.direction === 'rtl' ? theme.spacing(1) : 'auto',
  backgroundColor: theme.palette.primary.main,
  borderRadius: '50%',
  padding: theme.spacing(0.5),
  zIndex: 1,
}));

/**
 * Enhanced marketplace listing card component with Egyptian market optimizations
 */
export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  onClick,
  onFavoriteClick,
  isFavorite,
  className,
  isRTL = false,
  imageLoadingPriority = 'lazy',
  showMerchantBadge = true,
}) => {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language as 'ar' | 'en';

  // Memoize the listing title based on current language
  const title = useMemo(() => {
    return currentLanguage === 'ar' ? listing.titleAr : listing.titleEn;
  }, [listing.titleAr, listing.titleEn, currentLanguage]);

  // Handle favorite button click with propagation stop
  const handleFavoriteClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onFavoriteClick();
  }, [onFavoriteClick]);

  // Format location display
  const locationDisplay = useMemo(() => {
    const { address } = listing.location;
    return currentLanguage === 'ar' ? address.cityAr : address.city;
  }, [listing.location, currentLanguage]);

  return (
    <CustomCard
      onClick={onClick}
      className={className}
      isRTL={isRTL}
      hasImage
      imageRatio="56.25%"
      elevation={1}
      aria-label={t('listing.card.aria.label', { title })}
    >
      {/* Favorite Button */}
      <StyledFavoriteButton
        onClick={handleFavoriteClick}
        aria-label={t('listing.card.favorite.aria.label')}
        size="small"
        color={isFavorite ? 'secondary' : 'default'}
      >
        <FavoriteIcon color={isFavorite ? 'secondary' : 'inherit'} />
      </StyledFavoriteButton>

      {/* Merchant Verification Badge */}
      {showMerchantBadge && listing.merchantVerificationStatus === 'VERIFIED' && (
        <VerificationBadge>
          <VerifiedUserIcon
            sx={{ fontSize: 20, color: 'white' }}
            titleAccess={t('listing.card.verified.merchant')}
          />
        </VerificationBadge>
      )}

      {/* Listing Image */}
      <CardMedia
        component="img"
        loading={imageLoadingPriority}
        height="200"
        image={listing.images[0]}
        alt={title}
        sx={{ objectFit: 'cover' }}
      />

      {/* Content Section */}
      <CardContent sx={{ pt: 2, pb: '16px !important' }}>
        {/* Title */}
        <Typography
          variant="h6"
          component="h2"
          gutterBottom
          noWrap
          align={isRTL ? 'right' : 'left'}
          sx={{
            fontWeight: 600,
            mb: 1,
            direction: isRTL ? 'rtl' : 'ltr',
          }}
        >
          {title}
        </Typography>

        {/* Price Display */}
        <PriceDisplay
          piPrice={listing.price}
          locale={currentLanguage}
          showEgpEquivalent
          size="medium"
        />

        {/* Location */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 1,
            direction: isRTL ? 'rtl' : 'ltr',
            textAlign: isRTL ? 'right' : 'left',
          }}
        >
          {locationDisplay}
        </Typography>
      </CardContent>
    </CustomCard>
  );
};

// Loading skeleton for the listing card
export const ListingCardSkeleton: React.FC<{ isRTL?: boolean }> = ({ isRTL = false }) => (
  <CustomCard isRTL={isRTL}>
    <Skeleton variant="rectangular" height={200} />
    <CardContent>
      <Skeleton variant="text" width="80%" height={32} />
      <Skeleton variant="text" width="40%" height={24} sx={{ mt: 1 }} />
      <Skeleton variant="text" width="30%" height={20} sx={{ mt: 1 }} />
    </CardContent>
  </CustomCard>
);

export default ListingCard;