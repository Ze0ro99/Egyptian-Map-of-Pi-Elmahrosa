/**
 * @fileoverview Enhanced marketplace listing grid component for Egyptian Map of Pi
 * Implements responsive grid layout with RTL support, virtual scrolling, and cultural adaptations
 * @version 1.0.0
 */

import React, { useMemo, useCallback } from 'react';
import { 
  Grid, 
  Box, 
  Pagination, 
  CircularProgress, 
  Typography,
  Skeleton
} from '@mui/material';
import { useTheme, useMediaQuery } from '@mui/material';
import { useVirtualizer } from '@tanstack/react-virtual';

// Version comments for external dependencies
// @mui/material: ^5.14.0
// @tanstack/react-virtual: ^3.0.0

import ListingCard, { ListingCardSkeleton } from './ListingCard';
import type { Listing } from '../../interfaces/listing.interface';

/**
 * Props interface for the ListingGrid component with RTL support
 */
interface ListingGridProps {
  listings: Listing[];
  loading: boolean;
  totalItems: number;
  page: number;
  onPageChange: (page: number) => void;
  onListingClick: (id: string) => void;
  onFavoriteClick: (id: string) => void;
  favoriteListings: string[];
  isRTL: boolean;
  language: 'ar' | 'en';
  error: Error | null;
}

/**
 * Calculates grid columns based on screen size
 * Optimized for Egyptian device landscape
 */
const useGridColumns = () => {
  const theme = useTheme();
  const isXSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const isSmall = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isMedium = useMediaQuery(theme.breakpoints.between('md', 'lg'));

  return useMemo(() => {
    if (isXSmall) return 1; // Mobile phones (320px-428px)
    if (isSmall) return 2;  // Large phones and small tablets (428px-768px)
    if (isMedium) return 3; // Tablets (768px-1024px)
    return 4;               // Desktop (1024px+)
  }, [isXSmall, isSmall, isMedium]);
};

/**
 * Enhanced ListingGrid component with RTL support and performance optimizations
 */
export const ListingGrid: React.FC<ListingGridProps> = ({
  listings,
  loading,
  totalItems,
  page,
  onPageChange,
  onListingClick,
  onFavoriteClick,
  favoriteListings,
  isRTL,
  language,
  error
}) => {
  const theme = useTheme();
  const columns = useGridColumns();
  const itemsPerPage = 20;

  // Virtual scrolling configuration for performance
  const parentRef = React.useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: listings.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 300, // Estimated height of each listing card
    overscan: 5 // Number of items to render beyond visible area
  });

  // Memoized empty state messages
  const emptyStateMessages = useMemo(() => ({
    noListings: {
      ar: 'لا توجد قوائم متاحة',
      en: 'No listings available'
    },
    error: {
      ar: 'حدث خطأ في تحميل القوائم',
      en: 'Error loading listings'
    }
  }), []);

  // Handle page change with RTL support
  const handlePageChange = useCallback((
    _event: React.ChangeEvent<unknown>, 
    value: number
  ) => {
    onPageChange(value);
  }, [onPageChange]);

  // Loading skeleton grid
  if (loading) {
    return (
      <Grid container spacing={2} dir={isRTL ? 'rtl' : 'ltr'}>
        {Array.from({ length: itemsPerPage }).map((_, index) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={`skeleton-${index}`}>
            <ListingCardSkeleton isRTL={isRTL} />
          </Grid>
        ))}
      </Grid>
    );
  }

  // Error state
  if (error) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <Typography color="error" align={isRTL ? 'right' : 'left'}>
          {emptyStateMessages.error[language]}
        </Typography>
      </Box>
    );
  }

  // Empty state
  if (!loading && listings.length === 0) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <Typography color="textSecondary" align={isRTL ? 'right' : 'left'}>
          {emptyStateMessages.noListings[language]}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Virtualized Grid Container */}
      <Box
        ref={parentRef}
        sx={{
          height: '80vh',
          overflowY: 'auto',
          width: '100%',
          '&::-webkit-scrollbar': {
            width: '8px'
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.grey[300],
            borderRadius: '4px'
          }
        }}
      >
        <Grid container spacing={2} sx={{ width: '100%', margin: 0 }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const listing = listings[virtualRow.index];
            return (
              <Grid 
                item 
                xs={12} 
                sm={6} 
                md={4} 
                lg={3} 
                key={listing.id}
                sx={{ 
                  height: virtualRow.size,
                  transform: `translateY(${virtualRow.start}px)`,
                  position: 'absolute',
                  top: 0,
                  left: isRTL ? 'auto' : 0,
                  right: isRTL ? 0 : 'auto',
                  width: `${100 / columns}%`
                }}
              >
                <ListingCard
                  listing={listing}
                  onClick={() => onListingClick(listing.id)}
                  onFavoriteClick={() => onFavoriteClick(listing.id)}
                  isFavorite={favoriteListings.includes(listing.id)}
                  isRTL={isRTL}
                  imageLoadingPriority={virtualRow.index < 4 ? 'eager' : 'lazy'}
                />
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* Pagination with RTL support */}
      {totalItems > itemsPerPage && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            mt: 4,
            mb: 2
          }}
        >
          <Pagination
            count={Math.ceil(totalItems / itemsPerPage)}
            page={page}
            onChange={handlePageChange}
            color="primary"
            shape="rounded"
            dir={isRTL ? 'rtl' : 'ltr'}
            sx={{
              '& .MuiPaginationItem-root': {
                fontFamily: theme.typography.fontFamily
              }
            }}
          />
        </Box>
      )}
    </Box>
  );
};

// Default export
export default ListingGrid;