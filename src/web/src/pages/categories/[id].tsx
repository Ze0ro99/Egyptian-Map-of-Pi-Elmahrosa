/**
 * @fileoverview Dynamic category page component for Egyptian Map of Pi marketplace
 * Displays category-specific listings with RTL support, location filtering, and bilingual content
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';
import {
  Container,
  Typography,
  Box,
  Skeleton,
  Pagination
} from '@mui/material';

import ListingGrid from '../../components/listing/ListingGrid';
import MainLayout from '../../components/layout/MainLayout';
import { useListings } from '../../hooks/useListings';
import { CATEGORIES, getCategoryById } from '../../constants/categories';
import { ListingFilter } from '../../interfaces/listing.interface';

// Constants for pagination
const ITEMS_PER_PAGE = 20;

/**
 * Dynamic category page component with enhanced features
 */
const CategoryPage: React.FC = () => {
  // Hooks initialization
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  // Get category ID from URL
  const categoryId = router.query.id as string;
  const category = getCategoryById(categoryId);

  // Local state
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<ListingFilter>({
    category: categoryId,
    page: 1,
    limit: ITEMS_PER_PAGE,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Fetch listings with category filter
  const {
    listings,
    loading,
    error,
    totalItems,
    fetchListings
  } = useListings(filter);

  // Handle page change
  const handlePageChange = useCallback((
    _event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setPage(value);
    setFilter(prev => ({ ...prev, page: value }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Handle listing click
  const handleListingClick = useCallback((id: string) => {
    router.push(`/listings/${id}`);
  }, [router]);

  // Handle favorite toggle
  const handleFavoriteClick = useCallback((id: string) => {
    // Implement favorite toggle logic
    console.log('Toggle favorite:', id);
  }, []);

  // Refresh listings when filter changes
  useEffect(() => {
    fetchListings();
  }, [filter, fetchListings]);

  // If category not found, show 404
  if (!category) {
    return null; // Next.js will show 404 page
  }

  return (
    <>
      <Head>
        <title>
          {isRTL ? category.nameAr : category.nameEn} | {t('app.name')}
        </title>
        <meta
          name="description"
          content={t('category.meta.description', {
            category: isRTL ? category.nameAr : category.nameEn
          })}
        />
      </Head>

      <MainLayout>
        <Container maxWidth="lg" sx={{ py: 3 }}>
          {/* Category Header */}
          <Box
            sx={{
              mb: 4,
              textAlign: isRTL ? 'right' : 'left',
              direction: isRTL ? 'rtl' : 'ltr'
            }}
          >
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{ fontWeight: 600 }}
            >
              {isRTL ? category.nameAr : category.nameEn}
            </Typography>
            
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 2 }}
            >
              {t('category.itemCount', { count: totalItems })}
            </Typography>
          </Box>

          {/* Listings Grid */}
          <ListingGrid
            listings={listings}
            loading={loading}
            totalItems={totalItems}
            page={page}
            onPageChange={handlePageChange}
            onListingClick={handleListingClick}
            onFavoriteClick={handleFavoriteClick}
            favoriteListings={[]} // TODO: Implement favorites
            isRTL={isRTL}
            language={i18n.language as 'ar' | 'en'}
            error={error}
          />

          {/* Pagination */}
          {!loading && totalItems > ITEMS_PER_PAGE && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                mt: 4,
                mb: 2
              }}
            >
              <Pagination
                count={Math.ceil(totalItems / ITEMS_PER_PAGE)}
                page={page}
                onChange={handlePageChange}
                color="primary"
                shape="rounded"
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </Box>
          )}
        </Container>
      </MainLayout>
    </>
  );
};

/**
 * Server-side props with translation loading
 */
export const getServerSideProps: GetServerSideProps = async ({ locale, params }) => {
  // Validate category existence
  const categoryId = params?.id as string;
  const category = getCategoryById(categoryId);

  if (!category) {
    return {
      notFound: true
    };
  }

  return {
    props: {
      ...(await serverSideTranslations(locale || 'ar', [
        'common',
        'category'
      ]))
    }
  };
};

export default CategoryPage;