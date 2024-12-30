/**
 * @fileoverview Edit listing page component for the Egyptian Map of Pi marketplace
 * Implements bilingual editing interface with RTL support and optimistic updates
 * @version 1.0.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router'; // v13.0.0
import { useTranslation } from 'next-i18next'; // v13.0.0
import { Box, Typography, CircularProgress, Snackbar } from '@mui/material'; // v5.14.0

import ListingForm from '../../../components/listing/ListingForm';
import { useListings } from '../../../hooks/useListings';
import { Listing } from '../../../interfaces/listing.interface';
import { setLocalStorage, getLocalStorage } from '../../../utils/storage.util';

// Constants for local storage
const DRAFT_KEY_PREFIX = 'listing_draft_';
const AUTO_SAVE_DELAY = 3000;

/**
 * Edit listing page component with comprehensive error handling and offline support
 */
const EditListingPage: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = router.query;
  
  // Initialize hooks and state
  const {
    fetchListingById,
    updateListing,
    error: apiError
  } = useListings();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  /**
   * Fetches listing data with error handling and draft recovery
   */
  const fetchListing = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check for draft in local storage
      const draft = getLocalStorage(`${DRAFT_KEY_PREFIX}${id}`, true);
      
      if (draft) {
        setListing(draft);
        setSuccessMessage(t('listing.draftRecovered'));
      } else {
        const fetchedListing = await fetchListingById(id as string);
        setListing(fetchedListing);
      }
    } catch (err) {
      setError(t('listing.fetchError'));
      console.error('Error fetching listing:', err);
    } finally {
      setLoading(false);
    }
  }, [id, fetchListingById, t]);

  /**
   * Handles listing update with optimistic updates and error recovery
   */
  const handleUpdateListing = useCallback(async (updatedListing: Listing) => {
    try {
      setSaving(true);
      setError(null);

      // Save to local storage as backup
      setLocalStorage(`${DRAFT_KEY_PREFIX}${id}`, updatedListing, true);

      // Attempt to update listing
      await updateListing(id as string, updatedListing);

      // Clear draft on successful update
      setLocalStorage(`${DRAFT_KEY_PREFIX}${id}`, null);
      
      setSuccessMessage(t('listing.updateSuccess'));
      
      // Navigate back to listing details
      setTimeout(() => {
        router.push(`/listings/${id}`);
      }, 1500);

    } catch (err) {
      setError(t('listing.updateError'));
      console.error('Error updating listing:', err);
    } finally {
      setSaving(false);
    }
  }, [id, updateListing, router, t]);

  /**
   * Handles form errors with proper feedback
   */
  const handleFormError = useCallback((error: Error) => {
    setError(error.message);
  }, []);

  // Fetch listing data on mount
  useEffect(() => {
    if (id) {
      fetchListing();
    }
  }, [id, fetchListing]);

  // Clear success message after delay
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Show loading state
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Show error state
  if (error || apiError) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        gap={2}
        p={3}
      >
        <Typography color="error" align="center">
          {error || apiError?.message}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        align="center"
        sx={{ mb: 4 }}
      >
        {t('listing.editTitle')}
      </Typography>

      {listing && (
        <ListingForm
          initialValues={listing}
          onSubmit={handleUpdateListing}
          isSubmitting={saving}
          mode="edit"
          onError={handleFormError}
          language={router.locale as 'ar' | 'en'}
        />
      )}

      {/* Success message snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        message={successMessage}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: router.locale === 'ar' ? 'left' : 'right'
        }}
      />
    </Box>
  );
};

/**
 * Server-side props with authentication and initial data fetching
 */
export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    // Verify authentication status
    const { req } = context;
    const authToken = req.cookies['auth_token'];

    if (!authToken) {
      return {
        redirect: {
          destination: '/login',
          permanent: false,
        },
      };
    }

    // Return props
    return {
      props: {
        ...(await import('next-i18next/serverSideTranslations')
          .then(mod => mod.serverSideTranslations(context.locale ?? 'ar', ['common']))
        ),
      },
    };
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    return {
      notFound: true,
    };
  }
};

export default EditListingPage;