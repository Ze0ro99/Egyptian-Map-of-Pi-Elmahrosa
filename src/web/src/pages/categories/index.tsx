/**
 * @fileoverview Categories index page component for Egyptian Map of Pi marketplace
 * @version 1.0.0
 * 
 * Implements a responsive, bilingual category browsing interface with RTL support,
 * accessibility features, and mobile-first design.
 */

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/router';
import { Container, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import MainLayout from '../../components/layout/MainLayout';
import CategoryGrid from '../../components/listing/CategoryGrid';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useListings } from '../../hooks/useListings';

/**
 * Categories page component with enhanced Egyptian market features
 * Implements mobile-first design and bilingual support
 */
const CategoriesPage: React.FC = () => {
  // Hooks initialization
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { setFilter, isLoading } = useListings();
  
  // Local state for navigation
  const [isNavigating, setIsNavigating] = useState(false);

  /**
   * Handles category selection and navigation with loading state
   * @param categoryId - Selected category identifier
   */
  const handleCategoryClick = useCallback(async (categoryId: string) => {
    try {
      setIsNavigating(true);

      // Update listings filter with selected category
      setFilter({ category: categoryId });

      // Preserve existing query parameters
      const query = {
        ...router.query,
        category: categoryId
      };

      // Navigate to listings page with category filter
      await router.push({
        pathname: '/listings',
        query
      }, undefined, { 
        shallow: true,
        locale: router.locale 
      });

    } catch (error) {
      console.error('Navigation error:', error);
    } finally {
      setIsNavigating(false);
    }
  }, [router, setFilter]);

  return (
    <ErrorBoundary>
      <MainLayout>
        <Container
          maxWidth={false}
          sx={{
            paddingTop: { xs: 2, sm: 3 },
            paddingBottom: { xs: 2, sm: 3 },
            direction: 'inherit',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <CategoryGrid
            onCategoryClick={handleCategoryClick}
            isLoading={isLoading || isNavigating}
            testId="categories-page-grid"
          />
        </Container>
      </MainLayout>
    </ErrorBoundary>
  );
};

// Display name for debugging
CategoriesPage.displayName = 'CategoriesPage';

export default CategoriesPage;