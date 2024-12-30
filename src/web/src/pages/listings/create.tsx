/**
 * @fileoverview Create listing page component for Egyptian Map of Pi marketplace
 * Implements secure, bilingual listing creation with image upload and location selection
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Container, Typography, Alert, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';

import MainLayout from '../../components/layout/MainLayout';
import ListingForm from '../../components/listing/ListingForm';
import { useAuth } from '../../hooks/useAuth';
import { ListingService } from '../../services/listing.service';
import { Listing } from '../../interfaces/listing.interface';
import { ROUTES } from '../../constants/routes';
import StorageService from '../../services/storage.service';

// Initialize services
const listingService = new ListingService(StorageService);

/**
 * Enhanced page component for creating new marketplace listings
 * with comprehensive validation and Egyptian market support
 */
const CreateListingPage: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, isAuthenticated, isMerchantVerified } = useAuth();
  
  // Component state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftData, setDraftData] = useState<Partial<Listing> | null>(null);

  /**
   * Validates merchant status and authentication
   */
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace(ROUTES.AUTH.LOGIN);
      return;
    }

    if (!isMerchantVerified) {
      router.replace(ROUTES.PROFILE.VERIFICATION);
      return;
    }

    // Load any saved draft
    const savedDraft = localStorage.getItem('listing_draft');
    if (savedDraft) {
      try {
        setDraftData(JSON.parse(savedDraft));
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
  }, [isAuthenticated, isMerchantVerified, router]);

  /**
   * Handles form submission with enhanced error handling
   */
  const handleSubmit = useCallback(async (listingData: Listing) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Enhance listing data with seller information
      const enhancedListing = {
        ...listingData,
        seller: {
          piId: user?.piId,
          nameAr: user?.nameAr,
          nameEn: user?.nameEn,
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await listingService.createListing(enhancedListing);
      
      // Clear draft after successful submission
      localStorage.removeItem('listing_draft');
      
      // Redirect to listings page
      router.push(ROUTES.LISTINGS.ROOT);
    } catch (error) {
      setError(error.messageAr || t('listings.create.error'));
    } finally {
      setIsSubmitting(false);
    }
  }, [user, router, t]);

  /**
   * Handles form errors with bilingual support
   */
  const handleError = useCallback((error: Error) => {
    setError(error.message);
  }, []);

  /**
   * Auto-saves form data as draft
   */
  const handleDraftSave = useCallback((data: Partial<Listing>) => {
    try {
      localStorage.setItem('listing_draft', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }, []);

  // Show loading state while checking authentication
  if (!isAuthenticated || !user) {
    return (
      <MainLayout>
        <Container sx={{ py: 4, textAlign: 'center' }}>
          <CircularProgress />
        </Container>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Page Title */}
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom
          align="right"
          sx={{ mb: 4 }}
        >
          {t('listings.create.title')}
        </Typography>

        {/* Error Alert */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Listing Creation Form */}
        <ListingForm
          initialValues={draftData || undefined}
          onSubmit={handleSubmit}
          onError={handleError}
          isSubmitting={isSubmitting}
          mode="create"
          language="ar"
        />
      </Container>
    </MainLayout>
  );
};

// Export with display name for debugging
CreateListingPage.displayName = 'CreateListingPage';

export default CreateListingPage;