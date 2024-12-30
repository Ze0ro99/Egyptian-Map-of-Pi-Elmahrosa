/**
 * @fileoverview Enhanced listing detail page component for Egyptian Map of Pi
 * Implements comprehensive marketplace listing display with bilingual support,
 * RTL layout, Egyptian location services, and Pi payment integration.
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { GetServerSideProps, NextPage } from 'next';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import {
  Box,
  Container,
  Typography,
  Grid,
  Button,
  Paper,
  Divider,
  CircularProgress,
  Alert,
  Rating,
  Chip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  LocationOn,
  Store,
  Payment,
  Chat,
  Share,
  Report,
  ArrowBack
} from '@mui/icons-material';
import { ProgressiveImage } from 'react-progressive-image';

import { Listing } from '../../../interfaces/listing.interface';
import { ListingService } from '../../../services/listing.service';
import { getErrorMessage } from '../../../constants/errors';
import { apiService } from '../../../services/api.service';

// Constants for image optimization
const IMAGE_QUALITY = 75;
const BLUR_DATA_URL = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...'; // Base64 blur placeholder

interface ListingPageProps {
  initialData?: Listing;
  error?: string;
}

/**
 * Enhanced listing detail page component with Egyptian market features
 */
const ListingPage: NextPage<ListingPageProps> = ({ initialData, error: serverError }) => {
  const router = useRouter();
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isRTL = i18n.language === 'ar';

  // State management
  const [listing, setListing] = useState<Listing | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(serverError || null);
  const [selectedImage, setSelectedImage] = useState<number>(0);
  const [showContact, setShowContact] = useState(false);

  /**
   * Fetches listing data with Egyptian market validation
   */
  const fetchListing = useCallback(async () => {
    try {
      setLoading(true);
      const listingService = new ListingService(null);
      const data = await listingService.getListingById(router.query.id as string);
      setListing(data);
      setError(null);
    } catch (err: any) {
      setError(getErrorMessage(err.code || 'SYSTEM_INTERNAL_ERROR', i18n.language));
    } finally {
      setLoading(false);
    }
  }, [router.query.id, i18n.language]);

  useEffect(() => {
    if (!initialData) {
      fetchListing();
    }
  }, [fetchListing, initialData]);

  /**
   * Initiates Pi payment flow with Egyptian compliance
   */
  const handlePayment = async () => {
    try {
      if (!listing) return;

      const paymentData = {
        amount: listing.price,
        memo: `Payment for ${listing.titleEn}`,
        metadata: {
          listingId: listing.id,
          sellerId: listing.seller.piId,
          governorate: listing.governorate
        }
      };

      // Initialize Pi payment
      const response = await apiService.post('/payments/initialize', paymentData);
      
      // Redirect to Pi Browser payment flow
      window.location.href = response.data.paymentUrl;
    } catch (err: any) {
      setError(getErrorMessage(err.code || 'TRANSACTION_FAILED', i18n.language));
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !listing) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || t('errors.listing_not_found')}
        </Alert>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.back()}
          sx={{ mt: 2 }}
        >
          {t('common.back')}
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4, direction: isRTL ? 'rtl' : 'ltr' }}>
      <Grid container spacing={4}>
        {/* Image Gallery */}
        <Grid item xs={12} md={7}>
          <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <Box sx={{ position: 'relative', paddingTop: '75%' }}>
              <ProgressiveImage
                src={listing.images[selectedImage]}
                placeholder={BLUR_DATA_URL}
              >
                {(src: string, loading: boolean) => (
                  <Image
                    src={src}
                    alt={isRTL ? listing.titleAr : listing.titleEn}
                    layout="fill"
                    objectFit="contain"
                    quality={IMAGE_QUALITY}
                    style={{ opacity: loading ? 0.5 : 1 }}
                    priority
                  />
                )}
              </ProgressiveImage>
            </Box>
            <Grid container spacing={1} sx={{ mt: 2 }}>
              {listing.images.map((image, index) => (
                <Grid item xs={3} key={index}>
                  <Box
                    onClick={() => setSelectedImage(index)}
                    sx={{
                      cursor: 'pointer',
                      border: index === selectedImage ? `2px solid ${theme.palette.primary.main}` : 'none',
                      opacity: index === selectedImage ? 1 : 0.7
                    }}
                  >
                    <Image
                      src={image}
                      alt={`${isRTL ? listing.titleAr : listing.titleEn} - ${index + 1}`}
                      width={100}
                      height={100}
                      objectFit="cover"
                    />
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Listing Details */}
        <Grid item xs={12} md={5}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              {isRTL ? listing.titleAr : listing.titleEn}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
                {listing.price} Pi
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mx: 1 }}>
                ≈ {listing.priceEGP} EGP
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Seller Information */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Store sx={{ mr: 1 }} />
              <Typography variant="subtitle1">
                {listing.seller.nameAr}
              </Typography>
              <Rating
                value={listing.seller.rating}
                readOnly
                size="small"
                sx={{ ml: 1 }}
              />
            </Box>

            {/* Location */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LocationOn sx={{ mr: 1 }} />
              <Typography>
                {isRTL ? listing.location.address.governorateAr : listing.location.address.governorate}
              </Typography>
            </Box>

            {/* Description */}
            <Typography variant="body1" paragraph>
              {isRTL ? listing.descriptionAr : listing.descriptionEn}
            </Typography>

            {/* Action Buttons */}
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
                  startIcon={<Payment />}
                  onClick={handlePayment}
                >
                  {t('listing.buy_now')}
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Chat />}
                  onClick={() => setShowContact(true)}
                >
                  {t('listing.contact_seller')}
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Report />}
                  color="error"
                >
                  {t('listing.report')}
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

/**
 * Server-side props with Egyptian market validation
 */
export const getServerSideProps: GetServerSideProps<ListingPageProps> = async (context) => {
  try {
    const listingService = new ListingService(null);
    const listing = await listingService.getListingById(context.params?.id as string);

    return {
      props: {
        initialData: listing
      }
    };
  } catch (error: any) {
    return {
      props: {
        error: getErrorMessage(error.code || 'SYSTEM_INTERNAL_ERROR', 'ar')
      }
    };
  }
};

export default ListingPage;