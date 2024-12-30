/**
 * @fileoverview Home page component for Egyptian Map of Pi marketplace
 * @version 1.0.0
 * 
 * Implements mobile-first, RTL-ready design optimized for Egyptian users with
 * featured listings, category navigation, and bilingual support.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { GetStaticProps } from 'next';
import { Box, Container, Typography, Skeleton } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/router';

import MainLayout from '../components/layout/MainLayout';
import CategoryGrid from '../components/listing/CategoryGrid';
import ListingGrid from '../components/listing/ListingGrid';
import { useListings } from '../hooks/useListings';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';

/**
 * Home page component with enhanced Egyptian market optimizations
 */
const HomePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { theme, direction } = useTheme();
  const { isAuthenticated } = useAuth();
  const [favoriteListings, setFavoriteListings] = useState<string[]>([]);

  // Initialize listings hook with location-based filtering
  const {
    listings,
    loading,
    error,
    totalItems,
    filter,
    setFilter,
    fetchListings
  } = useListings({
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  /**
   * Handle category selection with navigation
   */
  const handleCategoryClick = useCallback((categoryId: string) => {
    router.push(`/categories/${categoryId}`);
  }, [router]);

  /**
   * Handle listing selection with navigation
   */
  const handleListingClick = useCallback((id: string) => {
    router.push(`/listings/${id}`);
  }, [router]);

  /**
   * Handle favorite toggle with authentication check
   */
  const handleFavoriteClick = useCallback((id: string) => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    setFavoriteListings(prev => 
      prev.includes(id) 
        ? prev.filter(listingId => listingId !== id)
        : [...prev, id]
    );
  }, [isAuthenticated, router]);

  /**
   * Handle page change for pagination
   */
  const handlePageChange = useCallback((page: number) => {
    setFilter({ ...filter, page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [filter, setFilter]);

  // Fetch listings on mount and language change
  useEffect(() => {
    fetchListings();
  }, [fetchListings, i18n.language]);

  return (
    <MainLayout>
      <Container
        maxWidth="lg"
        sx={{
          paddingTop: { xs: 2, sm: 3 },
          paddingBottom: { xs: 2, sm: 3 },
          direction: direction
        }}
      >
        {/* Categories Section */}
        <Box
          component="section"
          sx={{
            marginBottom: 4,
            textAlign: direction === 'rtl' ? 'right' : 'left'
          }}
        >
          <Typography
            variant="h5"
            component="h1"
            gutterBottom
            sx={{
              marginBottom: 2,
              textAlign: direction === 'rtl' ? 'right' : 'left',
              fontFamily: direction === 'rtl' ? 'var(--font-arabic)' : 'inherit'
            }}
          >
            {t('home.categories.title')}
          </Typography>

          <CategoryGrid
            onCategoryClick={handleCategoryClick}
            isLoading={loading}
            testId="home-categories"
          />
        </Box>

        {/* Featured Listings Section */}
        <Box
          component="section"
          sx={{
            marginBottom: 4,
            textAlign: direction === 'rtl' ? 'right' : 'left'
          }}
        >
          <Typography
            variant="h5"
            component="h2"
            gutterBottom
            sx={{
              marginBottom: 2,
              textAlign: direction === 'rtl' ? 'right' : 'left',
              fontFamily: direction === 'rtl' ? 'var(--font-arabic)' : 'inherit'
            }}
          >
            {t('home.featured.title')}
          </Typography>

          <ListingGrid
            listings={listings}
            loading={loading}
            totalItems={totalItems}
            page={filter.page || 1}
            onPageChange={handlePageChange}
            onListingClick={handleListingClick}
            onFavoriteClick={handleFavoriteClick}
            favoriteListings={favoriteListings}
            isRTL={direction === 'rtl'}
            language={i18n.language as 'ar' | 'en'}
            error={error}
          />
        </Box>
      </Container>
    </MainLayout>
  );
};

/**
 * Static props configuration with revalidation
 */
export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {},
    revalidate: 60 // Revalidate every minute
  };
};

export default HomePage;