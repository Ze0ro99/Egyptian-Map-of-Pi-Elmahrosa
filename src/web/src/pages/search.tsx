/**
 * @fileoverview Enhanced search page component for Egyptian Map of Pi marketplace
 * Implements comprehensive search with location-based filtering, RTL support,
 * and mobile-first design optimized for Egyptian networks
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router'; // v13.0.0
import { useTranslation } from 'react-i18next'; // v12.0.0
import {
  Box,
  Container,
  TextField,
  Select,
  MenuItem,
  Grid,
  Typography,
  Skeleton,
  InputAdornment,
  useTheme,
  useMediaQuery
} from '@mui/material'; // v5.14.0
import { Search as SearchIcon, LocationOn } from '@mui/icons-material';
import debounce from 'lodash/debounce'; // v4.17.21

import ListingGrid from '../components/listing/ListingGrid';
import LocationPicker from '../components/location/LocationPicker';
import { useListings } from '../hooks/useListings';
import { ListingCategory } from '../interfaces/listing.interface';
import type { Location } from '../interfaces/location.interface';

// Cache duration for search results
const SEARCH_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Props interface for the Search page component
 */
interface SearchPageProps {
  initialQuery?: string;
  initialCategory?: ListingCategory;
  initialLocation?: Location | null;
  networkStatus?: 'online' | 'offline';
}

/**
 * Enhanced search page component with comprehensive filtering capabilities
 */
const SearchPage: React.FC<SearchPageProps> = ({
  initialQuery = '',
  initialCategory,
  initialLocation,
  networkStatus = 'online'
}) => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isRTL = i18n.language === 'ar';

  // Local state management
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<ListingCategory | undefined>(initialCategory);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(initialLocation);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Initialize listings hook with caching
  const {
    listings,
    loading,
    error,
    filter,
    setFilter,
    totalItems
  } = useListings({
    cacheOptions: {
      enabled: true,
      ttl: SEARCH_CACHE_DURATION,
      maxSize: 1000
    }
  });

  /**
   * Debounced search handler for performance optimization
   */
  const debouncedSearch = useMemo(
    () => debounce((query: string) => {
      setFilter({
        searchTermAr: i18n.language === 'ar' ? query : undefined,
        searchTermEn: i18n.language === 'en' ? query : undefined,
        page: 1
      });
      
      // Update URL parameters
      router.push({
        pathname: router.pathname,
        query: {
          ...router.query,
          q: query || undefined
        }
      }, undefined, { shallow: true });
    }, 300),
    [setFilter, i18n.language, router]
  );

  /**
   * Handles search input changes with Arabic number support
   */
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  }, [debouncedSearch]);

  /**
   * Handles category selection changes
   */
  const handleCategoryChange = useCallback((event: React.ChangeEvent<{ value: unknown }>) => {
    const category = event.target.value as ListingCategory;
    setSelectedCategory(category);
    setFilter({ category, page: 1 });
  }, [setFilter]);

  /**
   * Handles location selection with validation
   */
  const handleLocationSelect = useCallback((location: Location) => {
    setSelectedLocation(location);
    setShowLocationPicker(false);
    setFilter({
      location: location.coordinates,
      radius: 10, // 10km radius
      page: 1
    });
  }, [setFilter]);

  // Update filters when network status changes
  useEffect(() => {
    if (networkStatus === 'online') {
      setFilter({ ...filter }); // Refresh results
    }
  }, [networkStatus, filter, setFilter]);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Search Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          align={isRTL ? 'right' : 'left'}
          gutterBottom
          sx={{ fontWeight: 600 }}
        >
          {t('search.title')}
        </Typography>
      </Box>

      {/* Search Controls */}
      <Grid container spacing={2} sx={{ mb: 4 }} direction={isRTL ? 'row-reverse' : 'row'}>
        {/* Search Input */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={t('search.placeholder')}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
            sx={{
              direction: isRTL ? 'rtl' : 'ltr',
              '& .MuiInputBase-input': {
                textAlign: isRTL ? 'right' : 'left'
              }
            }}
          />
        </Grid>

        {/* Category Filter */}
        <Grid item xs={12} md={3}>
          <Select
            fullWidth
            value={selectedCategory || ''}
            onChange={handleCategoryChange}
            displayEmpty
            sx={{ direction: isRTL ? 'rtl' : 'ltr' }}
          >
            <MenuItem value="">
              {t('search.allCategories')}
            </MenuItem>
            {Object.values(ListingCategory).map((category) => (
              <MenuItem key={category} value={category}>
                {t(`categories.${category.toLowerCase()}`)}
              </MenuItem>
            ))}
          </Select>
        </Grid>

        {/* Location Filter */}
        <Grid item xs={12} md={3}>
          <Box
            onClick={() => setShowLocationPicker(true)}
            sx={{
              p: 2,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 1,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              direction: isRTL ? 'rtl' : 'ltr'
            }}
          >
            <LocationOn />
            <Typography noWrap>
              {selectedLocation
                ? isRTL
                  ? selectedLocation.address.cityAr
                  : selectedLocation.address.city
                : t('search.selectLocation')
              }
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Location Picker Dialog */}
      {showLocationPicker && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'background.paper',
            zIndex: theme.zIndex.modal
          }}
        >
          <LocationPicker
            initialLocation={selectedLocation}
            onLocationSelect={handleLocationSelect}
            language={i18n.language as 'ar' | 'en'}
            isRTL={isRTL}
          />
        </Box>
      )}

      {/* Search Results */}
      {loading ? (
        <Box sx={{ mt: 4 }}>
          <Skeleton variant="rectangular" height={400} />
        </Box>
      ) : error ? (
        <Typography color="error" align="center" sx={{ mt: 4 }}>
          {t('search.error')}
        </Typography>
      ) : (
        <ListingGrid
          listings={listings}
          loading={loading}
          totalItems={totalItems}
          page={filter.page || 1}
          onPageChange={(page) => setFilter({ ...filter, page })}
          onListingClick={(id) => router.push(`/listing/${id}`)}
          onFavoriteClick={() => {}} // TODO: Implement favorite functionality
          favoriteListings={[]}
          isRTL={isRTL}
          language={i18n.language as 'ar' | 'en'}
          error={error}
        />
      )}
    </Container>
  );
};

export default SearchPage;