/**
 * @fileoverview Main marketplace listings page component for Egyptian Map of Pi
 * Implements RTL support, Arabic-first content, and Egyptian market optimizations
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { GetServerSideProps } from 'next';
import { Container, Box, Typography, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/router';

// Internal components and hooks
import ListingGrid from '../../components/listing/ListingGrid';
import Header from '../../components/common/Header';
import { useListings } from '../../hooks/useListings';
import useThemeHook from '../../hooks/useTheme';

// Types and interfaces
import type { ListingFilter } from '../../interfaces/listing.interface';
import type { Location } from '../../interfaces/location.interface';

// Constants for Egyptian market optimization
const EGYPT_BOUNDS = {
  LAT: { MIN: 22, MAX: 31.5 },
  LNG: { MIN: 25, MAX: 35 }
};

interface ListingsPageProps {
  initialFilter: ListingFilter;
  governorate?: string;
}

/**
 * Enhanced marketplace listings page with Egyptian market optimizations
 */
const ListingsPage: React.FC<ListingsPageProps> = ({ initialFilter, governorate }) => {
  // Hooks initialization
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const { direction } = useThemeHook();
  const isRTL = direction === 'rtl';

  // Listings management hook with Egyptian market features
  const {
    listings,
    loading,
    error,
    totalItems,
    currentPage,
    setFilter,
    fetchListings
  } = useListings(initialFilter);

  // Local state for location filtering
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);

  /**
   * Handle location-based filtering with Egyptian boundary validation
   */
  const handleLocationFilter = useCallback(async (location: Location) => {
    const { latitude, longitude } = location.coordinates;
    
    // Validate coordinates are within Egypt
    if (
      latitude < EGYPT_BOUNDS.LAT.MIN || 
      latitude > EGYPT_BOUNDS.LAT.MAX ||
      longitude < EGYPT_BOUNDS.LNG.MIN || 
      longitude > EGYPT_BOUNDS.LNG.MAX
    ) {
      console.error('Location outside Egypt boundaries');
      return;
    }

    setCurrentLocation(location);
    setFilter({
      ...initialFilter,
      location: location.coordinates,
      governorate: location.address.governorate
    });
  }, [initialFilter, setFilter]);

  /**
   * Handle page change with RTL support
   */
  const handlePageChange = useCallback((page: number) => {
    setFilter({ ...initialFilter, page });
    // Scroll to top with smooth behavior
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [initialFilter, setFilter]);

  /**
   * Handle listing click navigation
   */
  const handleListingClick = useCallback((id: string) => {
    router.push(`/listings/${id}`);
  }, [router]);

  /**
   * Effect to update document title with proper language
   */
  useEffect(() => {
    document.title = t('pages.listings.title');
  }, [t]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Enhanced header with location support */}
      <Header 
        elevation={0}
        onMenuClick={() => {}} // Implement menu handler
        showLocation={true}
        locationSelector={{
          currentLocation,
          onLocationSelect: handleLocationFilter,
          governorate
        }}
      />

      <Container 
        maxWidth="lg" 
        sx={{ 
          pt: { xs: 2, sm: 3 },
          pb: { xs: 8, sm: 10 },
          direction: isRTL ? 'rtl' : 'ltr'
        }}
      >
        {/* Market status message for Egyptian users */}
        {governorate && (
          <Typography 
            variant="h6" 
            component="h1" 
            gutterBottom
            align={isRTL ? 'right' : 'left'}
            sx={{ mb: 3 }}
          >
            {t('listings.location.governorate', { governorate })}
          </Typography>
        )}

        {/* Enhanced listing grid with RTL support */}
        <ListingGrid
          listings={listings}
          loading={loading}
          totalItems={totalItems}
          page={currentPage}
          onPageChange={handlePageChange}
          onListingClick={handleListingClick}
          onFavoriteClick={() => {}} // Implement favorite handler
          favoriteListings={[]}
          isRTL={isRTL}
          language={i18n.language as 'ar' | 'en'}
          error={error}
        />
      </Container>
    </Box>
  );
};

/**
 * Server-side props with Egyptian market validation
 */
export const getServerSideProps: GetServerSideProps = async (context) => {
  const { query } = context;
  
  // Initialize filter with Egyptian market defaults
  const initialFilter: ListingFilter = {
    page: Number(query.page) || 1,
    limit: 20,
    governorate: query.governorate as string,
    sortBy: query.sortBy as string || 'createdAt',
    sortOrder: query.sortOrder as string || 'desc'
  };

  return {
    props: {
      initialFilter,
      governorate: query.governorate || null
    }
  };
};

export default ListingsPage;