/**
 * @fileoverview Enhanced listing form component for the Egyptian Map of Pi marketplace
 * Implements bilingual form with RTL support, image upload, and location selection
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form'; // v7.45.0
import { zodResolver } from '@hookform/resolvers/zod'; // v3.3.0
import {
  Box,
  TextField,
  Button,
  MenuItem,
  Grid,
  CircularProgress,
  Typography,
  useTheme,
  styled
} from '@mui/material'; // v5.14.0

import { Listing, ListingCategory } from '../../interfaces/listing.interface';
import { listingSchema } from '../../validators/listing.validator';
import ImageUpload from '../common/ImageUpload';
import LocationPicker from '../location/LocationPicker';

// RTL-aware styled components
const FormContainer = styled(Box)(({ theme, rtl }: { theme: any, rtl: boolean }) => ({
  width: '100%',
  maxWidth: '800px',
  margin: '0 auto',
  padding: theme.spacing(3),
  direction: rtl ? 'rtl' : 'ltr',
}));

interface ListingFormProps {
  initialValues?: Partial<Listing>;
  onSubmit: (listing: Listing) => Promise<void>;
  isSubmitting?: boolean;
  mode?: 'create' | 'edit';
  onError?: (error: Error) => void;
  language?: 'ar' | 'en';
}

/**
 * Enhanced listing form component with comprehensive validation and accessibility
 */
const ListingForm: React.FC<ListingFormProps> = React.memo(({
  initialValues,
  onSubmit,
  isSubmitting = false,
  mode = 'create',
  onError,
  language = 'ar'
}) => {
  const theme = useTheme();
  const isRTL = language === 'ar';
  const [autoSaving, setAutoSaving] = useState(false);

  // Form initialization with Zod schema validation
  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch
  } = useForm<Listing>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      titleAr: initialValues?.titleAr || '',
      titleEn: initialValues?.titleEn || '',
      descriptionAr: initialValues?.descriptionAr || '',
      descriptionEn: initialValues?.descriptionEn || '',
      category: initialValues?.category || ListingCategory.FASHION_TRADITIONAL,
      price: initialValues?.price || 0,
      images: initialValues?.images || [],
      location: initialValues?.location || null,
    }
  });

  // Handle image upload state
  const handleImageChange = useCallback(async (urls: string[]) => {
    try {
      setValue('images', urls, { shouldValidate: true });
    } catch (error) {
      onError?.(error as Error);
    }
  }, [setValue, onError]);

  // Handle location selection
  const handleLocationChange = useCallback((location) => {
    setValue('location', location, { shouldValidate: true });
  }, [setValue]);

  // Auto-save functionality for edit mode
  useEffect(() => {
    let autoSaveTimeout: NodeJS.Timeout;

    if (mode === 'edit' && isDirty) {
      autoSaveTimeout = setTimeout(async () => {
        try {
          setAutoSaving(true);
          const formData = watch();
          await onSubmit(formData as Listing);
        } catch (error) {
          onError?.(error as Error);
        } finally {
          setAutoSaving(false);
        }
      }, 3000);
    }

    return () => clearTimeout(autoSaveTimeout);
  }, [mode, isDirty, watch, onSubmit, onError]);

  // Form submission handler
  const onFormSubmit = async (data: Listing) => {
    try {
      await onSubmit(data);
    } catch (error) {
      onError?.(error as Error);
    }
  };

  return (
    <FormContainer rtl={isRTL}>
      <form onSubmit={handleSubmit(onFormSubmit)} noValidate>
        <Grid container spacing={3}>
          {/* Arabic Title */}
          <Grid item xs={12}>
            <Controller
              name="titleAr"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="العنوان بالعربية"
                  error={!!errors.titleAr}
                  helperText={errors.titleAr?.message}
                  dir="rtl"
                  required
                />
              )}
            />
          </Grid>

          {/* English Title */}
          <Grid item xs={12}>
            <Controller
              name="titleEn"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Title in English"
                  error={!!errors.titleEn}
                  helperText={errors.titleEn?.message}
                  dir="ltr"
                  required
                />
              )}
            />
          </Grid>

          {/* Category Selection */}
          <Grid item xs={12}>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  fullWidth
                  label={isRTL ? "الفئة" : "Category"}
                  error={!!errors.category}
                  helperText={errors.category?.message}
                  dir={isRTL ? "rtl" : "ltr"}
                >
                  {Object.values(ListingCategory).map((category) => (
                    <MenuItem key={category} value={category}>
                      {isRTL ? getCategoryNameAr(category) : category}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>

          {/* Arabic Description */}
          <Grid item xs={12}>
            <Controller
              name="descriptionAr"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  multiline
                  rows={4}
                  label="الوصف بالعربية"
                  error={!!errors.descriptionAr}
                  helperText={errors.descriptionAr?.message}
                  dir="rtl"
                  required
                />
              )}
            />
          </Grid>

          {/* English Description */}
          <Grid item xs={12}>
            <Controller
              name="descriptionEn"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  multiline
                  rows={4}
                  label="Description in English"
                  error={!!errors.descriptionEn}
                  helperText={errors.descriptionEn?.message}
                  dir="ltr"
                  required
                />
              )}
            />
          </Grid>

          {/* Price Input */}
          <Grid item xs={12}>
            <Controller
              name="price"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  fullWidth
                  label={isRTL ? "السعر (Pi)" : "Price (Pi)"}
                  error={!!errors.price}
                  helperText={errors.price?.message}
                  InputProps={{
                    startAdornment: <Typography>π</Typography>,
                  }}
                  required
                />
              )}
            />
          </Grid>

          {/* Image Upload */}
          <Grid item xs={12}>
            <Controller
              name="images"
              control={control}
              render={({ field: { value } }) => (
                <ImageUpload
                  value={value}
                  onChange={handleImageChange}
                  maxImages={5}
                  rtl={isRTL}
                  errorMessage={errors.images?.message}
                />
              )}
            />
          </Grid>

          {/* Location Picker */}
          <Grid item xs={12}>
            <Controller
              name="location"
              control={control}
              render={({ field: { value } }) => (
                <LocationPicker
                  initialLocation={value}
                  onLocationSelect={handleLocationChange}
                  required
                  language={language}
                  isRTL={isRTL}
                  errorMessage={errors.location?.message}
                />
              )}
            />
          </Grid>

          {/* Submit Button */}
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={isSubmitting || autoSaving}
              startIcon={
                (isSubmitting || autoSaving) && <CircularProgress size={20} />
              }
            >
              {isRTL ? "نشر الإعلان" : "Post Listing"}
            </Button>
          </Grid>
        </Grid>
      </form>
    </FormContainer>
  );
});

// Helper function for Arabic category names
const getCategoryNameAr = (category: ListingCategory): string => {
  const categoryNamesAr: Record<ListingCategory, string> = {
    [ListingCategory.FASHION_TRADITIONAL]: "الأزياء التقليدية",
    [ListingCategory.FASHION_MODERN]: "الأزياء العصرية",
    [ListingCategory.ELECTRONICS]: "الإلكترونيات",
    [ListingCategory.FOOD_LOCAL]: "الطعام المحلي",
    [ListingCategory.FOOD_RESTAURANT]: "المطاعم",
    [ListingCategory.SERVICES_PROFESSIONAL]: "الخدمات المهنية",
    [ListingCategory.SERVICES_CRAFTS]: "الحرف اليدوية",
    [ListingCategory.HANDMADE]: "منتجات يدوية",
    [ListingCategory.ANTIQUES]: "التحف",
    [ListingCategory.OTHER]: "أخرى"
  };
  return categoryNamesAr[category];
};

ListingForm.displayName = 'ListingForm';

export default ListingForm;