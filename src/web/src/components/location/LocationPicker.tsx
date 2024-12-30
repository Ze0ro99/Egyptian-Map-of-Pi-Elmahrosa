/**
 * @fileoverview Enhanced LocationPicker component for Egyptian Map of Pi
 * Implements location selection with boundary validation, RTL support, and accessibility
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Box, Button, Typography, CircularProgress, Snackbar } from '@mui/material';
import { MyLocation, LocationOn } from '@mui/icons-material';

import Map from './Map';
import { useGeolocation } from '../../hooks/useGeolocation';
import { Location, LocationType } from '../../interfaces/location.interface';

/**
 * Props interface for the LocationPicker component
 */
interface LocationPickerProps {
  /** Initial location value */
  initialLocation?: Location | null;
  /** Callback function when location is selected */
  onLocationSelect: (location: Location) => void;
  /** Type of location being selected */
  locationType?: LocationType;
  /** Whether location selection is required */
  required?: boolean;
  /** Custom error message */
  errorMessage?: string;
  /** Interface language */
  language?: 'ar' | 'en';
  /** RTL layout direction */
  isRTL?: boolean;
}

/**
 * Enhanced LocationPicker component with comprehensive validation and accessibility
 */
const LocationPicker: React.FC<LocationPickerProps> = React.memo(({
  initialLocation = null,
  onLocationSelect,
  locationType = LocationType.DELIVERY_ADDRESS,
  required = false,
  errorMessage,
  language = 'ar',
  isRTL = true
}) => {
  // State management
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(initialLocation);
  const [showError, setShowError] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>(errorMessage || '');

  // Geolocation hook with tracking disabled
  const {
    location: currentLocation,
    error: locationError,
    loading: locationLoading,
    isWithinEgypt,
    getCurrentLocation,
    retryLocation
  } = useGeolocation(false, {
    enableHighAccuracy: true,
    timeout: 10000,
    retryAttempts: 3
  });

  /**
   * Handles location selection with validation
   */
  const handleLocationSelect = useCallback(async (location: Location) => {
    try {
      // Validate location is within Egypt
      if (!isWithinEgypt) {
        throw new Error(language === 'ar' 
          ? 'الموقع خارج حدود مصر'
          : 'Location is outside Egyptian boundaries'
        );
      }

      // Update location type
      const updatedLocation = {
        ...location,
        type: locationType,
        updatedAt: new Date()
      };

      setSelectedLocation(updatedLocation);
      onLocationSelect(updatedLocation);
      setShowError(false);
      setErrorText('');
    } catch (error) {
      setErrorText((error as Error).message);
      setShowError(true);
    }
  }, [isWithinEgypt, locationType, language, onLocationSelect]);

  /**
   * Handles current location button click
   */
  const handleCurrentLocation = useCallback(async () => {
    try {
      await getCurrentLocation();
      if (currentLocation && isWithinEgypt) {
        handleLocationSelect(currentLocation);
      }
    } catch (error) {
      setErrorText(language === 'ar'
        ? 'فشل في تحديد موقعك الحالي'
        : 'Failed to get your current location'
      );
      setShowError(true);
    }
  }, [getCurrentLocation, currentLocation, isWithinEgypt, handleLocationSelect, language]);

  // Update error message when prop changes
  useEffect(() => {
    if (errorMessage) {
      setErrorText(errorMessage);
      setShowError(true);
    }
  }, [errorMessage]);

  return (
    <Box
      sx={{
        width: '100%',
        height: '400px',
        position: 'relative',
        direction: isRTL ? 'rtl' : 'ltr'
      }}
      role="region"
      aria-label={language === 'ar' ? 'محدد الموقع' : 'Location Picker'}
    >
      {/* Map Component */}
      <Map
        markers={selectedLocation ? [selectedLocation] : []}
        selectedLocation={selectedLocation}
        onLocationSelect={handleLocationSelect}
        showUserLocation={true}
        interactive={true}
        enableClustering={false}
        accessibilityLabels={{
          mapContainer: language === 'ar' ? 'خريطة مصر التفاعلية' : 'Interactive map of Egypt',
          locationMarker: language === 'ar' ? 'علامة الموقع' : 'Location marker',
          userLocation: language === 'ar' ? 'موقعك الحالي' : 'Your current location'
        }}
      />

      {/* Controls Overlay */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          [isRTL ? 'right' : 'left']: 16,
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}
      >
        <Button
          variant="contained"
          startIcon={locationLoading ? <CircularProgress size={20} /> : <MyLocation />}
          onClick={handleCurrentLocation}
          disabled={locationLoading}
          aria-label={language === 'ar' ? 'استخدم موقعي الحالي' : 'Use my current location'}
          sx={{ minWidth: 200 }}
        >
          <Typography variant="button">
            {language === 'ar' ? 'موقعي الحالي' : 'My Location'}
          </Typography>
        </Button>

        {selectedLocation && (
          <Box
            sx={{
              backgroundColor: 'background.paper',
              padding: 2,
              borderRadius: 1,
              boxShadow: 1
            }}
          >
            <Typography variant="body2" color="textSecondary">
              <LocationOn fontSize="small" />
              {isRTL
                ? selectedLocation.address.streetNameAr || 'موقع محدد'
                : selectedLocation.address.street || 'Selected location'
              }
            </Typography>
          </Box>
        )}
      </Box>

      {/* Error Snackbar */}
      <Snackbar
        open={showError}
        autoHideDuration={6000}
        onClose={() => setShowError(false)}
        message={errorText}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: isRTL ? 'left' : 'right'
        }}
      />

      {/* Required Location Warning */}
      {required && !selectedLocation && (
        <Typography
          color="error"
          variant="caption"
          sx={{
            position: 'absolute',
            bottom: 8,
            [isRTL ? 'right' : 'left']: 16
          }}
        >
          {language === 'ar'
            ? 'يرجى تحديد الموقع'
            : 'Please select a location'
          }
        </Typography>
      )}
    </Box>
  );
});

LocationPicker.displayName = 'LocationPicker';

export default LocationPicker;