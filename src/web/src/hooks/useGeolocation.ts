/**
 * @fileoverview Enhanced geolocation hook for the Egyptian Map of Pi web application
 * Provides real-time location tracking, boundary validation, and error handling with Arabic support
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react'; // ^18.2.0
import { GeolocationService } from '../services/geolocation.service';
import { Location } from '../interfaces/location.interface';
import { mapConfig } from '../config/maps.config';

/**
 * Enhanced error type with bilingual support for Egyptian users
 */
interface GeolocationError {
  code: string;
  messageEn: string;
  messageAr: string;
  isRetryable: boolean;
}

/**
 * Configuration options for the geolocation hook
 */
interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  retryAttempts?: number;
  updateInterval?: number;
}

/**
 * Return type for the useGeolocation hook
 */
interface UseGeolocationReturn {
  location: Location | null;
  error: GeolocationError | null;
  loading: boolean;
  isWithinEgypt: boolean;
  getCurrentLocation: () => Promise<void>;
  stopTracking: () => void;
  retryLocation: () => void;
}

/**
 * Error messages with Arabic translations
 */
const ERROR_MESSAGES = {
  PERMISSION_DENIED: {
    en: 'Location permission was denied',
    ar: 'تم رفض إذن الموقع'
  },
  POSITION_UNAVAILABLE: {
    en: 'Location information is unavailable',
    ar: 'معلومات الموقع غير متوفرة'
  },
  TIMEOUT: {
    en: 'Location request timed out',
    ar: 'انتهت مهلة طلب الموقع'
  },
  BOUNDARY_ERROR: {
    en: 'Location is outside Egyptian boundaries',
    ar: 'الموقع خارج حدود مصر'
  }
};

/**
 * Enhanced custom hook for managing geolocation with caching and progressive loading
 * @param watchPosition - Whether to continuously watch position changes
 * @param options - Configuration options for geolocation
 * @returns UseGeolocationReturn interface with location state and control functions
 */
export const useGeolocation = (
  watchPosition: boolean = false,
  options: GeolocationOptions = {}
): UseGeolocationReturn => {
  // Initialize states with null safety
  const [location, setLocation] = useState<Location | null>(null);
  const [error, setError] = useState<GeolocationError | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isWithinEgypt, setIsWithinEgypt] = useState<boolean>(false);

  // Create memoized GeolocationService instance
  const geolocationService = useRef<GeolocationService>(
    new GeolocationService(options.updateInterval || mapConfig.updateInterval)
  ).current;

  // Track active watchers for cleanup
  const watcherId = useRef<number | null>(null);

  /**
   * Formats error with bilingual support
   */
  const formatError = useCallback((errorType: string): GeolocationError => {
    const messages = ERROR_MESSAGES[errorType as keyof typeof ERROR_MESSAGES] || {
      en: 'Unknown error occurred',
      ar: 'حدث خطأ غير معروف'
    };

    return {
      code: errorType,
      messageEn: messages.en,
      messageAr: messages.ar,
      isRetryable: errorType !== 'PERMISSION_DENIED'
    };
  }, []);

  /**
   * Gets current location with enhanced error handling
   */
  const getCurrentLocation = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const newLocation = await geolocationService.getCurrentPosition({
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        timeout: options.timeout ?? 10000,
        maximumAge: options.maximumAge ?? 0,
        retryAttempts: options.retryAttempts ?? 3
      });

      const withinBounds = geolocationService.isWithinEgyptianBounds(newLocation.coordinates);
      setIsWithinEgypt(withinBounds);

      if (withinBounds) {
        setLocation(newLocation);
      } else {
        setError(formatError('BOUNDARY_ERROR'));
      }
    } catch (err) {
      setError(formatError((err as Error).message));
      setLocation(null);
    } finally {
      setLoading(false);
    }
  }, [options, formatError]);

  /**
   * Handles position updates from watch
   */
  const handlePositionUpdate = useCallback((newLocation: Location) => {
    const withinBounds = geolocationService.isWithinEgyptianBounds(newLocation.coordinates);
    setIsWithinEgypt(withinBounds);

    if (withinBounds) {
      setLocation(newLocation);
      setError(null);
    } else {
      setError(formatError('BOUNDARY_ERROR'));
    }
  }, [formatError]);

  /**
   * Stops tracking location
   */
  const stopTracking = useCallback((): void => {
    if (watcherId.current) {
      geolocationService.stopWatchingPosition();
      watcherId.current = null;
    }
  }, [geolocationService]);

  /**
   * Retries location acquisition
   */
  const retryLocation = useCallback((): void => {
    if (error?.isRetryable) {
      if (watchPosition) {
        stopTracking();
        startWatching();
      } else {
        getCurrentLocation();
      }
    }
  }, [error, watchPosition, getCurrentLocation, stopTracking]);

  /**
   * Starts watching position
   */
  const startWatching = useCallback((): void => {
    setLoading(true);
    geolocationService.watchPosition(
      handlePositionUpdate,
      {
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        timeout: options.timeout ?? 10000,
        maximumAge: options.maximumAge ?? 0
      }
    );
  }, [geolocationService, handlePositionUpdate, options]);

  // Setup location watching or get initial position
  useEffect(() => {
    if (watchPosition) {
      startWatching();
    } else {
      getCurrentLocation();
    }

    return () => {
      stopTracking();
    };
  }, [watchPosition, getCurrentLocation, startWatching, stopTracking]);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      if (error) {
        retryLocation();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [error, retryLocation]);

  return {
    location,
    error,
    loading,
    isWithinEgypt,
    getCurrentLocation,
    stopTracking,
    retryLocation
  };
};