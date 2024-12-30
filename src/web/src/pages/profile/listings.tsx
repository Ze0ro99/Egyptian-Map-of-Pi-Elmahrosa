/**
 * @fileoverview Profile listings page component for Egyptian Map of Pi marketplace
 * Implements mobile-first design with RTL support, offline capabilities, and
 * enhanced performance optimizations for Egyptian market conditions.
 * @version 1.0.0
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Container, Typography, Skeleton, Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useIntersectionObserver } from 'react-intersection-observer';

import MainLayout from '../../components/layout/MainLayout';
import UserListings from '../../components/profile/UserListings';
import { useAuth } from '../../hooks/useAuth';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { ViewMode, SortOption } from '../../components/profile/UserListings';
import { ListingStatus } from '../../interfaces/listing.interface';

/**
 * Props interface for ProfileListingsPage
 */
interface ProfileListingsPageProps {
  userId?: string;
  isOffline?: boolean;
  connectionQuality?: 'good' | 'poor' | 'offline';
  cacheInfo?: {
    lastUpdated: number;
    isStale: boolean;
  };
}

/**
 * Enhanced profile listings page component with offline support and progressive loading
 */
const ProfileListingsPage: React.FC<ProfileListingsPageProps> = ({
  userId,
  isOffline = false,
  connectionQuality = 'good',
  cacheInfo
}) => {
  // Hooks initialization
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.GRID);
  const [sortBy, setSortBy] = useState<SortOption>(SortOption.NEWEST);

  // Intersection observer for progressive loading
  const { ref, inView } = useIntersectionObserver({
    threshold: 0.1,
    triggerOnce: true
  });

  // Check authentication and redirect if needed
  useEffect(() => {
    if (!isAuthenticated && !isOffline) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router, isOffline]);

  // Handle offline state
  if (isOffline) {
    return (
      <MainLayout>
        <Container>
          <Alert 
            severity="warning" 
            sx={{ mb: 2 }}
          >
            {t('common.offlineMode')}
            {cacheInfo && (
              <Typography variant="caption" display="block">
                {t('common.lastUpdated', { 
                  time: new Date(cacheInfo.lastUpdated).toLocaleString(
                    i18n.language === 'ar' ? 'ar-EG' : 'en-US'
                  )
                })}
              </Typography>
            )}
          </Alert>
        </Container>
      </MainLayout>
    );
  }

  // Handle poor connection state
  const renderConnectionWarning = () => {
    if (connectionQuality === 'poor') {
      return (
        <Alert 
          severity="info" 
          sx={{ mb: 2 }}
        >
          {t('common.poorConnection')}
        </Alert>
      );
    }
    return null;
  };

  // Handle loading state
  if (!user && !userId) {
    return (
      <MainLayout>
        <Container>
          <Skeleton variant="rectangular" height={200} />
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" />
        </Container>
      </MainLayout>
    );
  }

  return (
    <ErrorBoundary>
      <MainLayout>
        <Container>
          {renderConnectionWarning()}
          
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom
            sx={{ 
              textAlign: i18n.language === 'ar' ? 'right' : 'left',
              mb: 3 
            }}
          >
            {t('profile.listings.title')}
          </Typography>

          <UserListings
            userId={userId || user?.piId || ''}
            isCurrentUser={!userId || userId === user?.piId}
            viewMode={viewMode}
            sortBy={sortBy}
            ref={ref}
          />
        </Container>
      </MainLayout>
    </ErrorBoundary>
  );
};

/**
 * Server-side props with enhanced error handling and caching
 */
export async function getServerSideProps(context: any) {
  try {
    const { userId } = context.params || {};

    // Validate user ID if provided
    if (userId && typeof userId !== 'string') {
      return {
        notFound: true
      };
    }

    return {
      props: {
        userId: userId || null,
        isOffline: false,
        connectionQuality: 'good',
        cacheInfo: {
          lastUpdated: Date.now(),
          isStale: false
        }
      }
    };
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    return {
      props: {
        error: true
      }
    };
  }
}

export default ProfileListingsPage;