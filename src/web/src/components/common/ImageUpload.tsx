/**
 * @fileoverview Enhanced image upload component for the Egyptian Map of Pi marketplace
 * Implements mobile-first design with RTL support, image compression, and progress tracking
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Box, CircularProgress, IconButton, Grid, Typography } from '@mui/material';
import { AddPhotoAlternate, Delete, Error } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import StorageService from '../../services/storage.service';

// Constants for image handling
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DEFAULT_MAX_IMAGES = 5;
const COMPRESSION_QUALITY = 0.8;
const MAX_DIMENSION = 1200;
const UPLOAD_RETRY_ATTEMPTS = 3;

/**
 * Props interface for ImageUpload component with enhanced RTL support
 */
interface ImageUploadProps {
  /** Array of uploaded image URLs */
  value: string[];
  /** Callback function when images change */
  onChange: (urls: string[]) => void;
  /** Maximum number of allowed images */
  maxImages?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Allowed image types */
  allowedTypes?: string[];
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** RTL layout direction */
  rtl?: boolean;
  /** Custom error message */
  errorMessage?: string;
}

/**
 * Enhanced image upload component with mobile-first design and RTL support
 */
const ImageUpload: React.FC<ImageUploadProps> = ({
  value = [],
  onChange,
  maxImages = DEFAULT_MAX_IMAGES,
  disabled = false,
  allowedTypes = ALLOWED_IMAGE_TYPES,
  maxFileSize = MAX_FILE_SIZE,
  rtl = false,
  errorMessage,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Component state
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [previews, setPreviews] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);

  /**
   * Validates file type and size
   * @param file File to validate
   * @returns Validation result and error message
   */
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: t('imageUpload.invalidType', 'Invalid file type. Please use JPEG, PNG, or WebP')
      };
    }

    if (file.size > maxFileSize) {
      return {
        valid: false,
        error: t('imageUpload.fileTooLarge', 'File size exceeds 5MB limit')
      };
    }

    return { valid: true };
  }, [allowedTypes, maxFileSize, t]);

  /**
   * Handles image file selection and upload process
   */
  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const remainingSlots = maxImages - value.length;

    if (files.length > remainingSlots) {
      setErrors([t('imageUpload.tooManyFiles', 'Too many files selected')]);
      return;
    }

    setErrors([]);
    const newPreviews: string[] = [];
    const uploadPromises: Promise<string>[] = [];

    for (const file of files) {
      const validation = validateFile(file);
      if (!validation.valid) {
        setErrors(prev => [...prev, validation.error!]);
        continue;
      }

      try {
        setIsCompressing(true);
        const compressedFile = await StorageService.compressImage(file);
        setIsCompressing(false);

        // Generate preview
        const previewUrl = URL.createObjectURL(compressedFile);
        newPreviews.push(previewUrl);

        // Upload with progress tracking
        const uploadPromise = StorageService.uploadImage(compressedFile, 'listings')
          .then(url => {
            setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
            return url;
          })
          .catch(error => {
            setErrors(prev => [...prev, error.message]);
            return null;
          });

        uploadPromises.push(uploadPromise);
      } catch (error) {
        setErrors(prev => [...prev, t('imageUpload.compressionError', 'Error compressing image')]);
      }
    }

    // Update previews
    setPreviews(prev => [...prev, ...newPreviews]);

    // Process uploads
    const uploadedUrls = await Promise.all(uploadPromises);
    const validUrls = uploadedUrls.filter((url): url is string => url !== null);
    onChange([...value, ...validUrls]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [maxImages, value, onChange, validateFile, t]);

  /**
   * Handles image deletion
   */
  const handleImageDelete = useCallback((index: number) => {
    const newUrls = [...value];
    newUrls.splice(index, 1);
    onChange(newUrls);

    const newPreviews = [...previews];
    if (newPreviews[index]) {
      URL.revokeObjectURL(newPreviews[index]);
      newPreviews.splice(index, 1);
      setPreviews(newPreviews);
    }
  }, [value, onChange, previews]);

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previews]);

  return (
    <Box sx={{ width: '100%', direction: rtl ? 'rtl' : 'ltr' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept={allowedTypes.join(',')}
        multiple
        onChange={handleImageUpload}
        style={{ display: 'none' }}
        disabled={disabled || value.length >= maxImages}
      />

      <Grid container spacing={2} alignItems="center">
        {/* Upload button */}
        {value.length < maxImages && (
          <Grid item>
            <IconButton
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              sx={{
                width: 100,
                height: 100,
                border: '2px dashed',
                borderColor: 'grey.300',
                borderRadius: 2,
              }}
            >
              <AddPhotoAlternate />
            </IconButton>
          </Grid>
        )}

        {/* Image previews */}
        {value.map((url, index) => (
          <Grid item key={url}>
            <Box
              sx={{
                position: 'relative',
                width: 100,
                height: 100,
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <img
                src={url}
                alt={t('imageUpload.preview', 'Image preview')}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              {!disabled && (
                <IconButton
                  onClick={() => handleImageDelete(index)}
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: rtl ? 'auto' : 4,
                    left: rtl ? 4 : 'auto',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    },
                  }}
                >
                  <Delete sx={{ color: 'white' }} />
                </IconButton>
              )}
              {uploadProgress[url] !== undefined && uploadProgress[url] < 100 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  }}
                >
                  <CircularProgress
                    variant="determinate"
                    value={uploadProgress[url]}
                    size={40}
                  />
                </Box>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Error messages */}
      {errors.length > 0 && (
        <Box sx={{ mt: 2, color: 'error.main' }}>
          {errors.map((error, index) => (
            <Typography
              key={index}
              variant="caption"
              display="flex"
              alignItems="center"
              gap={1}
              sx={{ direction: rtl ? 'rtl' : 'ltr' }}
            >
              <Error fontSize="small" />
              {error}
            </Typography>
          ))}
        </Box>
      )}

      {/* Help text */}
      <Typography
        variant="caption"
        color="textSecondary"
        sx={{ mt: 1, display: 'block', direction: rtl ? 'rtl' : 'ltr' }}
      >
        {t('imageUpload.helpText', {
          count: maxImages - value.length,
          maxSize: Math.floor(maxFileSize / (1024 * 1024)),
        })}
      </Typography>
    </Box>
  );
};

export default ImageUpload;