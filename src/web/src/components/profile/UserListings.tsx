/**
 * @fileoverview UserListings component for displaying and managing marketplace listings
 * Implements Material Design with Egyptian cultural adaptations and RTL support
 * @version 1.0.0
 */

import React, { useMemo, useCallback, memo } from 'react';
import { 
  Grid, 
  Typography, 
  Pagination, 
  Select, 
  MenuItem, 
  CircularProgress, 
  Skeleton, 
  Alert,
  Box,
  Card,
  CardContent,
  CardMedia,
  Chip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useInView } from 'react-intersection-observer';
import { Listing, ListingStatus } from '../../interfaces/listing.interface';

// Constants for pagination and display
const ITEMS_PER_PAGE = 12;
const SKELETON_COUNT = 3;

/**
 * View mode enumeration for listing display
 */
export enum ViewMode {
  GRID = 'grid',
  LIST = 'list'
}

/**
 * Sort options enumeration
 */
export enum SortOption {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  PRICE_HIGH = 'price_high',
  PRICE_LOW = 'price_low'
}

/**
 * Props interface for UserListings component
 */
interface UserListingsProps {
  userId: string;
  isCurrentUser: boolean;
  className?: string;
  viewMode?: ViewMode;
  sortBy?: SortOption;
  initialPage?: number;
}

/**
 * UserListings component displays a user's marketplace listings with cultural adaptations
 */
const UserListings: React.FC<UserListingsProps> = memo(({
  userId,
  isCurrentUser,
  className,
  viewMode = ViewMode.GRID,
  sortBy = SortOption.NEWEST,
  initialPage = 1
}) => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const isRTL = i18n.language === 'ar';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Intersection observer for progressive loading
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true
  });

  // Memoized filter options
  const filterOptions = useMemo(() => [
    { value: ListingStatus.ACTIVE, label: t('listings.status.active') },
    { value: ListingStatus.PENDING_REVIEW, label: t('listings.status.pending') },
    { value: ListingStatus.SOLD, label: t('listings.status.sold') },
    { value: ListingStatus.INACTIVE, label: t('listings.status.inactive') }
  ], [t]);

  // Memoized sort options
  const sortOptions = useMemo(() => [
    { value: SortOption.NEWEST, label: t('listings.sort.newest') },
    { value: SortOption.OLDEST, label: t('listings.sort.oldest') },
    { value: SortOption.PRICE_HIGH, label: t('listings.sort.priceHigh') },
    { value: SortOption.PRICE_LOW, label: t('listings.sort.priceLow') }
  ], [t]);

  // Mock data - Replace with actual API call
  const { data: listings, isLoading, error } = useMemo(() => ({
    data: [] as Listing[],
    isLoading: false,
    error: null
  }), []);

  // Handle pagination change
  const handlePageChange = useCallback((event: React.ChangeEvent<unknown>, page: number) => {
    // Implement pagination logic
  }, []);

  // Handle sort change
  const handleSortChange = useCallback((event: React.ChangeEvent<{ value: unknown }>) => {
    // Implement sort logic
  }, []);

  // Handle status filter change
  const handleStatusChange = useCallback((event: React.ChangeEvent<{ value: unknown }>) => {
    // Implement status filter logic
  }, []);

  // Render loading skeleton
  const renderSkeleton = useCallback(() => (
    <Grid container spacing={2}>
      {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
        <Grid item xs={12} sm={6} md={4} key={`skeleton-${index}`}>
          <Skeleton variant="rectangular" height={200} />
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" />
        </Grid>
      ))}
    </Grid>
  ), []);

  // Render listing card
  const renderListingCard = useCallback((listing: Listing) => (
    <Card 
      elevation={1}
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        direction: isRTL ? 'rtl' : 'ltr'
      }}
    >
      <CardMedia
        component="img"
        height="200"
        image={listing.images[0]}
        alt={isRTL ? listing.titleAr : listing.titleEn}
        sx={{ objectFit: 'cover' }}
      />
      <CardContent>
        <Typography variant="h6" component="h2" noWrap>
          {isRTL ? listing.titleAr : listing.titleEn}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {`${listing.price} Pi`}
        </Typography>
        <Chip 
          label={t(`listings.status.${listing.status.toLowerCase()}`)}
          size="small"
          color={listing.status === ListingStatus.ACTIVE ? 'success' : 'default'}
          sx={{ mt: 1 }}
        />
      </CardContent>
    </Card>
  ), [isRTL, t]);

  // Error state
  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {t('listings.error.loading')}
      </Alert>
    );
  }

  return (
    <Box className={className} sx={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      {/* Filters and Sort */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Select
            fullWidth
            value={sortBy}
            onChange={handleSortChange}
            size="small"
          >
            {sortOptions.map(option => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </Grid>
        {isCurrentUser && (
          <Grid item xs={12} sm={6}>
            <Select
              fullWidth
              value={ListingStatus.ACTIVE}
              onChange={handleStatusChange}
              size="small"
            >
              {filterOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </Grid>
        )}
      </Grid>

      {/* Loading State */}
      {isLoading && renderSkeleton()}

      {/* Listings Grid */}
      {!isLoading && listings.length > 0 && (
        <Grid container spacing={2} ref={ref}>
          {listings.map(listing => (
            <Grid item xs={12} sm={6} md={4} key={listing.id}>
              {renderListingCard(listing)}
            </Grid>
          ))}
        </Grid>
      )}

      {/* Empty State */}
      {!isLoading && listings.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            {t('listings.empty.message')}
          </Typography>
        </Box>
      )}

      {/* Pagination */}
      {listings.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={Math.ceil(listings.length / ITEMS_PER_PAGE)}
            page={initialPage}
            onChange={handlePageChange}
            color="primary"
            size={isMobile ? 'small' : 'medium'}
            siblingCount={isMobile ? 0 : 1}
          />
        </Box>
      )}

      {/* Progressive Loading Indicator */}
      {inView && isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}
    </Box>
  );
});

UserListings.displayName = 'UserListings';

export default UserListings;