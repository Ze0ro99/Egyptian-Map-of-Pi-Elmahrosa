/**
 * @fileoverview Advanced React hook for managing marketplace listings with support for 
 * bilingual content, real-time updates, optimistic UI, caching, and location-based filtering.
 * @version 1.0.0
 */

import { useSelector, useDispatch } from 'react-redux';
import { useState, useEffect, useCallback } from 'react';
import { Listing, ListingFilter, ListingStatus, ListingCategory } from '../interfaces/listing.interface';
import { Location, Coordinates } from '../interfaces/location.interface';

// Constants for Egyptian geographic boundaries
const EGYPT_BOUNDS = {
  LAT: { MIN: 22, MAX: 31.5 },
  LNG: { MIN: 25, MAX: 35 }
};

// Cache configuration type
interface CacheOptions {
  enabled: boolean;
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of cached items
}

// Default cache options
const DEFAULT_CACHE_OPTIONS: CacheOptions = {
  enabled: true,
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 1000
};

// Error response type
interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Advanced hook for managing marketplace listings with comprehensive features
 * @param initialFilter - Initial filter configuration
 * @param cacheOptions - Cache configuration options
 */
export function useListings(
  initialFilter?: Partial<ListingFilter>,
  cacheOptions: Partial<CacheOptions> = {}
) {
  const dispatch = useDispatch();
  const mergedCacheOptions = { ...DEFAULT_CACHE_OPTIONS, ...cacheOptions };

  // Local state management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorResponse | null>(null);
  const [filter, setFilter] = useState<ListingFilter>({
    page: 1,
    limit: 20,
    ...initialFilter
  });
  const [isOnline, setIsOnline] = useState(true);
  const [retryQueue, setRetryQueue] = useState<Array<() => Promise<void>>>([]);

  // Redux state selectors
  const listings = useSelector((state: any) => state.listings.items);
  const totalItems = useSelector((state: any) => state.listings.total);
  const currentPage = useSelector((state: any) => state.listings.currentPage);

  /**
   * Validates Egyptian geographic coordinates
   * @param coordinates - Location coordinates to validate
   */
  const validateEgyptianCoordinates = useCallback((coordinates?: Coordinates): boolean => {
    if (!coordinates) return false;
    const { latitude, longitude } = coordinates;
    return (
      latitude >= EGYPT_BOUNDS.LAT.MIN &&
      latitude <= EGYPT_BOUNDS.LAT.MAX &&
      longitude >= EGYPT_BOUNDS.LNG.MIN &&
      longitude <= EGYPT_BOUNDS.LNG.MAX
    );
  }, []);

  /**
   * Fetches listings with advanced filtering and caching
   */
  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate location filter if present
      if (filter.location && !validateEgyptianCoordinates(filter.location)) {
        throw {
          code: 'INVALID_LOCATION',
          message: 'Location coordinates must be within Egyptian boundaries'
        };
      }

      // Dispatch Redux action to fetch listings
      await dispatch({
        type: 'listings/fetch',
        payload: filter
      });
    } catch (err) {
      setError({
        code: err.code || 'FETCH_ERROR',
        message: err.message || 'Failed to fetch listings'
      });
      
      // Add to retry queue if offline
      if (!isOnline) {
        setRetryQueue(prev => [...prev, fetchListings]);
      }
    } finally {
      setLoading(false);
    }
  }, [dispatch, filter, isOnline, validateEgyptianCoordinates]);

  /**
   * Fetches a single listing by ID with cache support
   */
  const fetchListingById = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first if enabled
      if (mergedCacheOptions.enabled) {
        const cached = await dispatch({
          type: 'listings/getCached',
          payload: id
        });
        if (cached) return cached;
      }

      return await dispatch({
        type: 'listings/fetchById',
        payload: id
      });
    } catch (err) {
      setError({
        code: err.code || 'FETCH_ERROR',
        message: err.message || 'Failed to fetch listing'
      });
    } finally {
      setLoading(false);
    }
  }, [dispatch, mergedCacheOptions.enabled]);

  /**
   * Creates a new listing with optimistic updates
   */
  const createListing = useCallback(async (listing: Partial<Listing>) => {
    try {
      setLoading(true);
      setError(null);

      // Validate location
      if (!validateEgyptianCoordinates(listing.location?.coordinates)) {
        throw {
          code: 'INVALID_LOCATION',
          message: 'Location must be within Egyptian boundaries'
        };
      }

      // Optimistic update
      const optimisticId = `temp-${Date.now()}`;
      dispatch({
        type: 'listings/addOptimistic',
        payload: { ...listing, id: optimisticId }
      });

      // Actual API call
      const result = await dispatch({
        type: 'listings/create',
        payload: listing
      });

      // Remove optimistic update
      dispatch({
        type: 'listings/removeOptimistic',
        payload: optimisticId
      });

      return result;
    } catch (err) {
      setError({
        code: err.code || 'CREATE_ERROR',
        message: err.message || 'Failed to create listing'
      });
    } finally {
      setLoading(false);
    }
  }, [dispatch, validateEgyptianCoordinates]);

  /**
   * Updates an existing listing with optimistic updates
   */
  const updateListing = useCallback(async (id: string, updates: Partial<Listing>) => {
    try {
      setLoading(true);
      setError(null);

      // Validate location if included in updates
      if (updates.location && !validateEgyptianCoordinates(updates.location.coordinates)) {
        throw {
          code: 'INVALID_LOCATION',
          message: 'Location must be within Egyptian boundaries'
        };
      }

      // Optimistic update
      dispatch({
        type: 'listings/updateOptimistic',
        payload: { id, updates }
      });

      // Actual API call
      const result = await dispatch({
        type: 'listings/update',
        payload: { id, updates }
      });

      return result;
    } catch (err) {
      // Revert optimistic update
      dispatch({
        type: 'listings/revertOptimistic',
        payload: id
      });

      setError({
        code: err.code || 'UPDATE_ERROR',
        message: err.message || 'Failed to update listing'
      });
    } finally {
      setLoading(false);
    }
  }, [dispatch, validateEgyptianCoordinates]);

  /**
   * Deletes a listing with optimistic updates
   */
  const deleteListing = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      // Optimistic update
      dispatch({
        type: 'listings/deleteOptimistic',
        payload: id
      });

      // Actual API call
      await dispatch({
        type: 'listings/delete',
        payload: id
      });
    } catch (err) {
      // Revert optimistic update
      dispatch({
        type: 'listings/revertDelete',
        payload: id
      });

      setError({
        code: err.code || 'DELETE_ERROR',
        message: err.message || 'Failed to delete listing'
      });
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  /**
   * Updates the current filter and triggers a new fetch
   */
  const updateFilter = useCallback((newFilter: Partial<ListingFilter>) => {
    setFilter(prev => ({
      ...prev,
      ...newFilter,
      page: 1 // Reset to first page on filter change
    }));
  }, []);

  /**
   * Resets the filter to initial state
   */
  const resetFilter = useCallback(() => {
    setFilter({
      page: 1,
      limit: 20,
      ...initialFilter
    });
  }, [initialFilter]);

  /**
   * Retries failed operations when coming back online
   */
  const retryFailedOperations = useCallback(async () => {
    if (retryQueue.length === 0) return;

    const operations = [...retryQueue];
    setRetryQueue([]);

    for (const operation of operations) {
      await operation();
    }
  }, [retryQueue]);

  // Set up WebSocket connection for real-time updates
  useEffect(() => {
    const ws = new WebSocket(process.env.REACT_APP_WS_URL || 'ws://localhost:8080');

    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      dispatch({
        type: 'listings/handleRealTimeUpdate',
        payload: update
      });
    };

    ws.onclose = () => setIsOnline(false);
    ws.onopen = () => setIsOnline(true);

    return () => {
      ws.close();
    };
  }, [dispatch]);

  // Monitor online status and retry failed operations
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      retryFailedOperations();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [retryFailedOperations]);

  // Initial fetch
  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  return {
    listings,
    loading,
    error,
    filter,
    totalItems,
    currentPage,
    isOnline,
    fetchListings,
    fetchListingById,
    createListing,
    updateListing,
    deleteListing,
    setFilter: updateFilter,
    resetFilter,
    retryFailedOperation: retryFailedOperations
  };
}